// CSVを1回だけ読み込んで全グラフに使い回す
Papa.parse("global_ads_performance_dataset.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function (results) {
    const data = results.data.filter((row) => row.platform);

    drawRoasChart(data);
    drawTrendChart(data);
    drawShareChart(data);
    drawCampaignChart(data);
  },
});

// ① プラットフォーム別ROAS比較（棒グラフ）
function drawRoasChart(data) {
  const platforms = ["Google Ads", "Meta Ads", "TikTok Ads"];
  const roasData = platforms.map((platform) => {
    const filtered = data.filter((row) => row.platform === platform);
    const avg =
      filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length;
    return Math.round(avg * 100) / 100;
  });

  const ctx = document.getElementById("roasChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: platforms,
      datasets: [
        {
          label: "平均ROAS",
          data: roasData,
          backgroundColor: ["#4285F4", "#1877F2", "#000000"],
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#aaaaaa" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#aaaaaa" },
        },
      },
    },
  });
}

// ② 月別広告費トレンド（折れ線グラフ）
function drawTrendChart(data) {
  const monthlyData = {};
  data.forEach((row) => {
    const month = row.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = 0;
    monthlyData[month] += row.ad_spend;
  });

  const months = Object.keys(monthlyData).sort();
  const spends = months.map((m) => Math.round(monthlyData[m]));

  const ctx = document.getElementById("trendChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "月別総広告費（USD）",
          data: spends,
          borderColor: "#4285F4",
          backgroundColor: "rgba(66,133,244,0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#aaaaaa" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#aaaaaa" },
        },
      },
    },
  });
}

// ③ プラットフォーム別広告費シェア（円グラフ）
function drawShareChart(data) {
  const platforms = ["Google Ads", "Meta Ads", "TikTok Ads"];
  const spendData = platforms.map((platform) => {
    const filtered = data.filter((row) => row.platform === platform);
    const total = filtered.reduce((sum, row) => sum + row.ad_spend, 0);
    return Math.round(total);
  });

  const ctx = document.getElementById("shareChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: platforms,
      datasets: [
        {
          label: "広告費シェア",
          data: spendData,
          backgroundColor: ["#4285F4", "#1877F2", "#000000"],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: { color: "#aaaaaa" },
        },
      },
    },
  });
}

// ④ キャンペーンタイプ別ROAS比較（棒グラフ）
function drawCampaignChart(data) {
  const campaignTypes = ["Search", "Display", "Shopping", "Video"];
  const roasData = campaignTypes.map((type) => {
    const filtered = data.filter((row) => row.campaign_type === type);
    const avg =
      filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length;
    return Math.round(avg * 100) / 100;
  });

  const ctx = document.getElementById("campaignChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: campaignTypes,
      datasets: [
        {
          label: "平均ROAS",
          data: roasData,
          backgroundColor: ["#34A853", "#FBBC05", "#EA4335", "#4285F4"],
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#aaaaaa" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#aaaaaa" },
        },
      },
    },
  });
}
