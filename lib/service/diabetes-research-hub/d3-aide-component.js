async function initializeAgpChart(participant_id) {
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const response = await fetch(
    `/drh/api/ambulatory-glucose-profile/?participant_id=${participant_id}`,
  );

  // Check if the request was successful
  if (!response.ok) {
    throw new Error(
      "Network response was not ok " + response.statusText,
    );
  }
  const result = await response.json();

  if (
    result.ambulatoryGlucoseProfile &&
    Object.keys(result.ambulatoryGlucoseProfile).length > 0
  ) {
    const data = result.ambulatoryGlucoseProfile;

    const chart = new AGPChartD3Aide(
      "svg#agp-chart",
      data,
      width,
      height,
      margin,
    );
  }
}

async function initializeStackedBarChart(participant_id) {
  const response = await fetch(
    `/drh/api/time_range_stacked_metrics/?participant_id=${participant_id}`,
  );

  // Check if the request was successful
  if (!response.ok) {
    throw new Error(
      "Network response was not ok " + response.statusText,
    );
  }
  const result = await response.json();
  const timeMetrics = result.timeMetrics;

  const chartHeight = 400;
  const chartWidth = 700;

  const chartdata = [
    {
      category: "Very Low",
      value: timeMetrics.timeBelowRangeVeryLow,
      goal: "<1%",
      color: "#A93226",
    },
    {
      category: "Low",
      value: timeMetrics.timeBelowRangeLow,
      goal: "<4%",
      color: "#E74C3C",
    },
    {
      category: "Target",
      value: timeMetrics.timeInRange,
      goal: "≥70%",
      color: "#27AE60",
    },
    {
      category: "High",
      value: timeMetrics.timeAboveRangeHigh,
      goal: "<25%",
      color: "#F39C12",
    },
    {
      category: "Very High",
      value: timeMetrics.timeAboveRangeVeryHigh,
      goal: "<5%",
      color: "#D35400",
    },
  ];

  const chart = new StackedBarChartD3Aide(
    ".chartContainer",
    chartdata,
    chartWidth,
    chartHeight,
    false,
    false,
  );
}

function divideDatesIntoWeeks(startDate, endDate, data) {
  const weeks = [];
  let currentWeekStart = new Date(startDate);

  while (currentWeekStart <= endDate) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      const weekData = data.filter((entry) => {
          const entryDate = new Date(entry.datetime);
          return (
              entryDate >= currentWeekStart && entryDate <= currentWeekEnd
          );
      });

      weeks.push({
          start: new Date(currentWeekStart),
          end: new Date(currentWeekEnd),
          data: weekData,
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  return weeks;
}

function generateTimeSeries(start, end) {
  const times = [];
  let current = start;
  while (current <= end) {
      times.push(new Date(current));
      current.setHours(current.getHours() + 1);
  }
  return times;
}

function formatDateToMatch(date) {
  return date.toISOString().slice(0, 19);
}

async function initializeDgpChart(participant_id) {
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Add a 3-second delay

  const response = await fetch(
    `/drh/api/daily-glcuose-profile/?participant_id=${participant_id}`,
  );

  // Check if the request was successful
  if (!response.ok) {
    throw new Error(
      "Network response was not ok " + response.statusText,
    );
  }
  const result = await response.json();

  if (result.daily_glucose_profile.length > 0) {
    const originalData = result.daily_glucose_profile;

    const transformedData = originalData.map((entry) => ({
      datetime: `${entry.date}T${entry.hour.padStart(2, "0")}:00:00`,
      glucose: entry.glucose,
    }));

    const dgpStartDate = new Date(transformedData[0].datetime);
    var dgpEndDate = new Date(
      transformedData[transformedData.length - 1].datetime,
    );

    const differenceInMilliseconds = dgpEndDate - dgpStartDate;

    const differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
    if (differenceInDays < 13) {
      const fourteenthDay = new Date(startDate).getTime() +
        13 * 24 * 60 * 60 * 1000;
      dgpEndDate = fourteenthDay;
    }

    const timeSeries = generateTimeSeries(dgpStartDate, dgpEndDate);
    const dataMap = new Map(
      transformedData.map((d) => [
        formatDateToMatch(new Date(d.datetime)),
        d.glucose,
      ]),
    );

    const completeData = timeSeries.map((d) => {
      const formattedDate = formatDateToMatch(d);
      const glucoseValue = dataMap.get(formattedDate);
      return {
        datetime: formattedDate,
        glucose: glucoseValue === undefined ? null : glucoseValue,
      };
    });

    const weeks = divideDatesIntoWeeks(
      completeData[0].datetime,
      dgpEndDate,
      completeData,
    );


    const chart1 = new DGPChartD3Aide(weeks[0].data, "#dgp-wk", 0);
    chart1.drawChart();
    const chart2 = new DGPChartD3Aide(weeks[1].data, "#dgp-wk", 1);
    chart2.drawChart();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  for (const container of document.getElementsByClassName("participant_id")) {
    const participant_id = container.value;
    initializeStackedBarChart(participant_id);
    initializeAgpChart(participant_id);
    initializeDgpChart(participant_id);
  }
});
