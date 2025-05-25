let bundleChart = null;
let bundleHistory = [];

function parseRecommendedDuration(notes) {
  const today = new Date();
  let startDate = null;
  let endDate = null;

  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const todayNormalized = normalizeDate(today);

  const explicitDateMatch = notes.match(
    /Start:\s*(\d{4}-\d{2}-\d{2}),?\s*End:\s*(\d{4}-\d{2}-\d{2})/i
  );
  if (explicitDateMatch) {
    startDate = normalizeDate(new Date(explicitDateMatch[1] + "T00:00:00"));
    endDate = normalizeDate(new Date(explicitDateMatch[2] + "T00:00:00"));
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      return { startDate, endDate };
    } else {
      startDate = null; // Reset if parsing failed
      endDate = null;
    }
  }

  const durationFromDateMatch = notes.match(
    /(\d+)\s+(days?|weeks?|months?)\s+from\s+(\d{4}-\d{2}-\d{2})/i
  );
  if (durationFromDateMatch) {
    const count = parseInt(durationFromDateMatch[1]);
    const unit = durationFromDateMatch[2].toLowerCase();
    const fromDateStr = durationFromDateMatch[3];
    startDate = normalizeDate(new Date(fromDateStr + "T00:00:00"));

    if (startDate && !isNaN(startDate)) {
      endDate = new Date(startDate);
      if (unit.startsWith("day")) {
        endDate.setDate(startDate.getDate() + count);
      } else if (unit.startsWith("week")) {
        endDate.setDate(startDate.getDate() + count * 7);
      } else if (unit.startsWith("month")) {
        endDate.setMonth(startDate.getMonth() + count);
      }
      endDate = normalizeDate(endDate);
      return { startDate, endDate };
    } else {
      startDate = null;
    }
  }

  const twoWeeksMatch = notes.match(/(\d+)\s+weeks?/i);
  const daysMatch = notes.match(/(\d+)\s+days?/i);
  const monthMatch = notes.match(/for the month of (\w+)/i);
  const untilEndOfMonthMatch = notes.match(/until (?:the )?end of (\w+)/i);
  const entireSeasonMatch = notes.match(/entire (\w+) season/i);

  if (twoWeeksMatch && !startDate) {
    startDate = new Date(todayNormalized);
    endDate = new Date(todayNormalized);
    endDate.setDate(todayNormalized.getDate() + parseInt(twoWeeksMatch[1]) * 7);
  } else if (daysMatch && !startDate) {
    startDate = new Date(todayNormalized);
    endDate = new Date(todayNormalized);
    endDate.setDate(todayNormalized.getDate() + parseInt(daysMatch[1]));
  } else if (untilEndOfMonthMatch && !startDate) {
    const monthName = untilEndOfMonthMatch[1];
    const monthIndex = new Date(Date.parse(monthName + " 1, 2000")).getMonth();
    if (monthIndex >= 0) {
      const currentYear = today.getFullYear();
      startDate = new Date(todayNormalized);
      endDate = normalizeDate(new Date(currentYear, monthIndex + 1, 0));

      if (endDate < startDate && startDate.getMonth() !== endDate.getMonth()) {
        endDate.setFullYear(currentYear + 1);
      }

      if (
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() > monthIndex
      ) {
        startDate = normalizeDate(new Date(currentYear, monthIndex, 1));
      }
    }
  } else if (entireSeasonMatch && !startDate) {
    const season = entireSeasonMatch[1].toLowerCase();
    const year = today.getFullYear();

    if (season === "summer") {
      startDate = normalizeDate(new Date(year, 5, 1));
      endDate = normalizeDate(new Date(year, 7, 31));
    } else if (season === "winter") {
      startDate = normalizeDate(new Date(year, 11, 1));

      const winterEndDateYear = today.getMonth() === 11 ? year + 1 : year;
      endDate = normalizeDate(
        new Date(
          winterEndDateYear,
          1,
          new Date(winterEndDateYear, 1, 0).getDate() + 1
        )
      ); // Last day of Feb
    } else if (season === "spring") {
      startDate = normalizeDate(new Date(year, 2, 1));
      endDate = normalizeDate(new Date(year, 4, 31));
    } else if (season === "autumn" || season === "fall") {
      startDate = normalizeDate(new Date(year, 8, 1));
      endDate = normalizeDate(new Date(year, 10, 30));
    }
  }

  if (startDate && endDate && endDate < startDate) {
    if (
      endDate.getFullYear() < startDate.getFullYear() &&
      endDate.getMonth() < startDate.getMonth()
    ) {
      endDate.setFullYear(startDate.getFullYear());
      if (endDate < startDate) endDate.setFullYear(startDate.getFullYear() + 1);
    } else if (
      endDate.getFullYear() === startDate.getFullYear() &&
      endDate.getMonth() < startDate.getMonth()
    ) {
      endDate.setFullYear(startDate.getFullYear() + 1);
    } else {
      console.warn("Parsed end date is before start date, returning null.", {
        notes,
        startDate,
        endDate,
      });
      return null;
    }
  }

  return startDate && endDate
    ? { startDate: normalizeDate(startDate), endDate: normalizeDate(endDate) }
    : null;
}

function displayBundleCalendar(container, durationNotes) {
  container.innerHTML = "";
  container.style.display = "block";

  const parsedDates = parseRecommendedDuration(durationNotes);

  if (!parsedDates || !parsedDates.startDate || !parsedDates.endDate) {
    container.innerHTML = `<p><em>Could not determine a specific date range from notes. Raw notes: "${durationNotes}"</em></p>`;
    return;
  }

  const { startDate, endDate } = parsedDates;

  const displayMonthDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    1
  );

  const calendarEl = document.createElement("div");
  calendarEl.className = "calendar-grid";

  const header = document.createElement("div");
  header.className = "calendar-header";
  header.textContent = `${displayMonthDate.toLocaleString("default", {
    month: "long",
  })} ${displayMonthDate.getFullYear()}`;
  calendarEl.appendChild(header);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  daysOfWeek.forEach((day) => {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day-name";
    dayEl.textContent = day;
    calendarEl.appendChild(dayEl);
  });

  const firstDayOfMonthIndex = displayMonthDate.getDay();
  for (let i = 0; i < firstDayOfMonthIndex; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarEl.appendChild(emptyCell);
  }

  const daysInMonth = new Date(
    displayMonthDate.getFullYear(),
    displayMonthDate.getMonth() + 1,
    0
  ).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";
    dayCell.textContent = day;

    const cellDate = new Date(
      displayMonthDate.getFullYear(),
      displayMonthDate.getMonth(),
      day
    );

    if (cellDate >= startDate && cellDate <= endDate) {
      dayCell.classList.add("highlighted-range");
    }
    if (cellDate.getTime() === startDate.getTime()) {
      dayCell.classList.add("start-date");
    }
    if (cellDate.getTime() === endDate.getTime()) {
      dayCell.classList.add("end-date");
    }
    calendarEl.appendChild(dayCell);
  }
  container.appendChild(calendarEl);

  const rangeText = document.createElement("p");
  rangeText.className = "calendar-range-text";
  rangeText.textContent = `Recommended: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  container.appendChild(rangeText);
}

function renderHistory() {
  const historyDiv = document.querySelector(".sidebar .history");
  historyDiv.innerHTML = "<h3>History</h3>";
  if (bundleHistory.length === 0) {
    historyDiv.innerHTML +=
      "<p>No bundles generated yet. Please write a prompt and click on generate.</p>";
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "history-list";

  bundleHistory.forEach((historyItem, index) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.textContent = `${
      historyItem.bundle_name || `Bundle #${bundleHistory.length - index}`
    } - ${new Date(historyItem.timestamp).toLocaleTimeString()}`;
    li.addEventListener("click", () => {
      const existingErrorInBundleDiv = document.querySelector(
        ".bundle > p[style*='color:red']"
      );
      if (existingErrorInBundleDiv) existingErrorInBundleDiv.remove();

      const bundleProductInfoDiv = document.querySelector(
        ".bundle-product-info"
      );
      const existingChartError = bundleProductInfoDiv.querySelector(
        ".chart-error-message"
      );
      if (existingChartError) existingChartError.remove();

      renderBundle(historyItem.bundleData);
      document
        .querySelectorAll(".history-item")
        .forEach((item) => item.classList.remove("active"));
      li.classList.add("active");
    });
    ul.appendChild(li);
  });
  historyDiv.appendChild(ul);
}

function saveHistory() {
  localStorage.setItem("bundleHistory", JSON.stringify(bundleHistory));
}

function loadHistory() {
  const storedHistory = localStorage.getItem("bundleHistory");
  if (storedHistory) {
    bundleHistory = JSON.parse(storedHistory);
    renderHistory();
  }
}

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const fileInput = document.getElementById("dataFile");
  const userPromptInput = document.getElementById("userPrompt");

  const existingChartError = document.querySelector(".chart-error-message");
  if (existingChartError) {
    existingChartError.remove();
  }
  const existingBundleError = document.querySelector(
    ".bundle > p[style*='color:red']"
  );
  if (existingBundleError) {
    existingBundleError.remove();
  }

  if (fileInput.files.length > 0) {
    formData.append("dataFile", fileInput.files[0]);
  }
  formData.append("user_input", userPromptInput.value);

  const submitButton = document.querySelector(
    '#uploadForm button[type="submit"]'
  );
  submitButton.disabled = true;
  submitButton.textContent = "Generating...";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      body: formData,
    });

    const bundle = await response.json();
    renderBundle(bundle);

    if (!bundle.error) {
      bundleHistory.unshift({
        bundleData: bundle,
        bundle_name: bundle.bundle_name || "Untitled Bundle",
        timestamp: new Date().toISOString(),
      });
      if (bundleHistory.length > 10) {
        bundleHistory.pop();
      }
      saveHistory();
      renderHistory();
    }
  } catch (error) {
    console.error("Failed to fetch or process bundle:", error);
    const div = document.querySelector(".bundle");
    div.innerHTML = `<p style="color:red;">An unexpected error occurred. Please try again.</p>`;

    const chartCanvas = document.getElementById("bundle-chart");
    if (chartCanvas) chartCanvas.style.display = "none";
    if (bundleChart) {
      bundleChart.destroy();
      bundleChart = null;
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Generate";
    fileInput.value = "";
  }
});

function renderBundle(bundle) {
  const bundleDiv = document.querySelector(".bundle");
  const chartCanvas = document.getElementById("bundle-chart");
  const bundleProductInfoDiv = document.querySelector(".bundle-product-info");

  const existingChartErrorMsg = bundleProductInfoDiv.querySelector(
    ".chart-error-message"
  );
  if (existingChartErrorMsg) {
    existingChartErrorMsg.remove();
  }
  const existingBundleError = bundleDiv.querySelector("p[style*='color:red']");
  if (existingBundleError) {
    existingBundleError.remove();
  }

  if (bundle.error) {
    bundleDiv.innerHTML = `<p style="color:red;">Error: ${bundle.error}</p>`;
    if (chartCanvas) chartCanvas.style.display = "none";
    if (bundleChart) {
      bundleChart.destroy();
      bundleChart = null;
    }

    const bundleCalendarContainer = document.querySelector(
      ".bundle-calendar-container"
    );
    if (bundleCalendarContainer) bundleCalendarContainer.style.display = "none";
    return;
  }

  let productsHtml = "<p>No products listed.</p>";
  if (bundle.products && bundle.products.length > 0) {
    productsHtml = bundle.products
      .map((product, index) => {
        const price =
          bundle.price_per_product &&
          bundle.price_per_product[index] !== undefined
            ? `€${Number(bundle.price_per_product[index]).toFixed(2)}`
            : "Price N/A";

        const sku =
          bundle.skus && bundle.skus[index] ? bundle.skus[index] : "SKU N/A";
        const stockLevel =
          bundle.product_stock_levels && bundle.product_stock_levels[index]
            ? bundle.product_stock_levels[index]
            : "Stock N/A";
        const salesMetric =
          bundle.product_sales_metrics && bundle.product_sales_metrics[index]
            ? bundle.product_sales_metrics[index]
            : "Sales Metrics N/A";

        return `<li class="product-item">
                  <div class="product-main-info">
                    <span class="product-name">${product}</span> - 
                    <span class="product-sku">(SKU: ${sku})</span> - 
                    <span class="product-price">${price}</span>
                  </div>
                  <div class="product-additional-info">
                    <span class="product-stock">Stock: ${stockLevel}</span><br>
                    <span class="product-sales">Sales: ${salesMetric}</span>
                  </div>
                </li>`;
      })
      .join("");
  }

  bundleDiv.innerHTML = `
    <h2>${bundle.bundle_name || "Bundle"}</h2>
    <div class="bundle-details">
        <div class="edit"><button>Edit</button></div>
        <p><strong>Original Total Price:</strong> €${
          bundle.original_total_price !== undefined &&
          bundle.original_total_price !== null
            ? Number(bundle.original_total_price).toFixed(2)
            : "N/A"
        }</p>
        <p><strong>Final Bundle Price:</strong> €${
          bundle.total_price !== undefined && bundle.total_price !== null
            ? Number(bundle.total_price).toFixed(2)
            : "N/A"
        }</p>
        <p><strong>Discount:</strong> ${
          bundle.discount_percent !== undefined &&
          bundle.discount_percent !== null
            ? Number(bundle.discount_percent).toFixed(1)
            : "N/A"
        }%</p>
        <p><strong>Trend:</strong> ${bundle.trend || "N/A"}</p>
        <p><strong>Margin:</strong> ${
          bundle.margin !== undefined && bundle.margin !== null
            ? typeof bundle.margin === "number"
              ? Number(bundle.margin).toFixed(2) +
                (bundle.margin_type === "percentage"
                  ? "%"
                  : bundle.margin_type === "absolute_eur"
                  ? " EUR"
                  : "")
              : bundle.margin
            : "N/A"
        }</p>
        <p><strong>Summary:</strong> ${
          bundle.summary || "No summary provided."
        }</p>
        <p><strong>Expected Result:</strong> ${
          bundle.result || "No expected result stated."
        }</p>
        ${
          bundle.recommended_duration_notes
            ? `<p><strong>Recommended Duration Notes:</strong> <span id="duration-notes-text">${bundle.recommended_duration_notes}</span></p>`
            : ""
        }
        </div>
    <h3>Products in this Bundle:</h3>
    <ul class="product-list">
      ${productsHtml}
    </ul>
  `;

  if (bundle.recommended_duration_notes) {
    const bundleDetailsDiv = bundleDiv.querySelector(".bundle-details");
    let calendarContainerDiv = bundleDetailsDiv.querySelector(
      ".bundle-calendar-container"
    );
    if (!calendarContainerDiv) {
      calendarContainerDiv = document.createElement("div");
      calendarContainerDiv.className = "bundle-calendar-container";
      calendarContainerDiv.innerHTML = `<h3>Recommended Availability Window</h3><div id="bundleCalendar" class="calendar"></div>`;
      bundleDetailsDiv.appendChild(calendarContainerDiv);
    }
    calendarContainerDiv.style.display = "block";
    const calendarElement = document.getElementById("bundleCalendar");
    if (calendarElement) {
      displayBundleCalendar(calendarElement, bundle.recommended_duration_notes);
    }
  } else {
    const calendarContainerDiv = bundleDiv.querySelector(
      ".bundle-calendar-container"
    );
    if (calendarContainerDiv) {
      calendarContainerDiv.style.display = "none";
    }
  }

  if (
    bundle.products &&
    bundle.price_per_product &&
    bundle.products.length > 0 &&
    bundle.products.length === bundle.price_per_product.length
  ) {
    if (chartCanvas) chartCanvas.style.display = "block";

    if (bundleChart) {
      bundleChart.destroy();
    }

    const ctx = chartCanvas.getContext("2d");
    let delayed;
    bundleChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: bundle.products,
        datasets: [
          {
            label: "Price per Product (€)",
            data: bundle.price_per_product.map((price) => Number(price)),
            backgroundColor: [
              "rgba(255, 99, 132, 0.2)",
              "rgba(54, 162, 235, 0.2)",
              "rgba(255, 206, 86, 0.2)",
              "rgba(75, 192, 192, 0.2)",
              "rgba(153, 102, 255, 0.2)",
              "rgba(255, 159, 64, 0.2)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(153, 102, 255, 1)",
              "rgba(255, 159, 64, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        animation: {
          onComplete: () => {
            delayed = true;
          },
          delay: (context) => {
            let delay = 0;
            if (
              context.type === "data" &&
              context.mode === "default" &&
              !delayed
            ) {
              delay = context.dataIndex * 300 + context.datasetIndex * 100;
            }
            return delay;
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Price (€)" } },
          x: { title: { display: true, text: "Products" } },
        },
        plugins: {
          legend: { position: "top" },
          title: {
            display: true,
            text: `Product Prices for "${bundle.bundle_name || "Bundle"}"`,
          },
        },
      },
    });
  } else {
    console.warn("Chart data is invalid or incomplete.");
    if (chartCanvas) chartCanvas.style.display = "none";
    if (bundleChart) {
      bundleChart.destroy();
      bundleChart = null;
    }

    if (
      bundleProductInfoDiv &&
      !bundleProductInfoDiv.querySelector(".chart-error-message") &&
      bundle.products &&
      bundle.products.length > 0
    ) {
      const errorMsg = document.createElement("p");
      errorMsg.textContent =
        "Chart cannot be displayed: Product price data is missing or inconsistent.";
      errorMsg.style.color = "orange";
      errorMsg.className = "chart-error-message";
      bundleProductInfoDiv.appendChild(errorMsg);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const chartCanvas = document.getElementById("bundle-chart");
  if (chartCanvas) {
    chartCanvas.style.display = "none";
  }
  loadHistory();
  renderHistory();
});
