// ============================================
// グラフインスタンスの管理
// 同じcanvasに複数のグラフが描画されるのを防ぐ
// ============================================
const chartInstances = {};

// グラフを破棄してから再生成する関数
// リロード時にアニメーションが動かない問題を解決
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy(); // 既存のグラフを破棄
  }
}

// ============================================
// KPIカードの描画
// 総広告費・平均ROAS・総CV数・平均CPAを表示
// ============================================
function drawKpiCards(data) {
  // 総広告費（全行のad_spendを合計してM（百万）単位に変換）
  const totalSpend = data.reduce((sum, row) => sum + row.ad_spend, 0);
  document.getElementById("totalSpend").textContent =
    "$" + (totalSpend / 1000000).toFixed(2) + "M";

  // 平均ROAS（全行のROASを合計して件数で割る）
  const avgRoas = data.reduce((sum, row) => sum + row.ROAS, 0) / data.length;
  document.getElementById("avgRoas").textContent = avgRoas.toFixed(2);

  // 総CV数（全行のconversionsを合計してカンマ区切りで表示）
  const totalConversions = data.reduce((sum, row) => sum + row.conversions, 0);
  document.getElementById("totalConversions").textContent =
    totalConversions.toLocaleString();

  // 平均CPA（全行のCPAを合計して件数で割る）
  const avgCpa = data.reduce((sum, row) => sum + row.CPA, 0) / data.length;
  document.getElementById("avgCpa").textContent = "$" + avgCpa.toFixed(2);
}

// ============================================
// CSVの読み込み（1回だけ読み込んで全グラフに使い回す）
// ============================================
Papa.parse("global_ads_performance_dataset.csv", {
  download: true, // ファイルをダウンロードして読み込む
  header: true, // 1行目をカラム名として扱う
  dynamicTyping: true, // 数字は数字型として自動変換
  complete: function (results) {
    // 空行を除外したデータを取得
    const data = results.data.filter((row) => row.platform);

    // ローディングを非表示にする
    document.getElementById("loading").style.display = "none";

    // 各グラフを描画
    drawKpiCards(data);
    drawRoasChart(data);
    drawTrendChart(data);
    drawShareChart(data);
    drawCampaignChart(data);
  },
  error: function () {
    // 読み込み失敗時のエラーメッセージを表示
    document.getElementById("loading").innerHTML =
      "<p>データの読み込みに失敗しました。</p>";
  },
});

// ============================================
// ① プラットフォーム別ROAS比較（棒グラフ）
// Google・Meta・TikTokの平均ROASを比較
// ============================================
function drawRoasChart(data) {
  const platforms = ["Google Ads", "Meta Ads", "TikTok Ads"];

  // プラットフォームごとにROASの平均を計算
  const roasData = platforms.map((platform) => {
    const filtered = data.filter((row) => row.platform === platform);
    const avg =
      filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length;
    return Math.round(avg * 100) / 100; // 小数点2桁に丸める
  });

  const ctx = document.getElementById("roasChart").getContext("2d");
  destroyChart("roasChart"); // 既存グラフを破棄
  chartInstances["roasChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: platforms,
      datasets: [
        {
          label: "平均ROAS",
          data: roasData,
          backgroundColor: ["#4285F4", "#1877F2", "#000000"], // Google・Meta・TikTokのカラー
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } }, // 凡例を非表示
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" }, // グリッド線を薄く
          ticks: { color: "#aaaaaa" }, // 目盛りの色
        },
        x: {
          grid: { display: false },
          ticks: { color: "#aaaaaa" },
        },
      },
      animation: { duration: 1000, easing: "easeOutQuart" },
    },
  });
}

// ============================================
// ② 月別広告費トレンド（折れ線グラフ）
// 月ごとの総広告費の推移を表示
// ============================================
function drawTrendChart(data) {
  // 月ごとに広告費を集計
  const monthlyData = {};
  data.forEach((row) => {
    const month = row.date.substring(0, 7); // 日付から年月を抜き出す（例：2024-01）
    if (!monthlyData[month]) monthlyData[month] = 0;
    monthlyData[month] += row.ad_spend; // 月ごとに広告費を加算
  });

  const months = Object.keys(monthlyData).sort(); // 月を昇順に並べる
  const spends = months.map((m) => Math.round(monthlyData[m])); // 広告費を整数に丸める

  const ctx = document.getElementById("trendChart").getContext("2d");
  destroyChart("trendChart"); // 既存グラフを破棄
  chartInstances["trendChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "月別総広告費（USD）",
          data: spends,
          borderColor: "#4285F4",
          backgroundColor: "rgba(66,133,244,0.1)", // 線の下を薄く塗りつぶす
          fill: true,
          tension: 0.3, // 線を少し曲線にする
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
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
      animation: { duration: 1000, easing: "easeOutQuart" },
    },
  });
}

// ============================================
// ③ プラットフォーム別広告費シェア（円グラフ）
// 各プラットフォームの広告費の割合を表示
// ============================================
function drawShareChart(data) {
  const platforms = ["Google Ads", "Meta Ads", "TikTok Ads"];

  // プラットフォームごとに広告費を合計
  const spendData = platforms.map((platform) => {
    const filtered = data.filter((row) => row.platform === platform);
    const total = filtered.reduce((sum, row) => sum + row.ad_spend, 0);
    return Math.round(total);
  });

  const ctx = document.getElementById("shareChart").getContext("2d");
  destroyChart("shareChart"); // 既存グラフを破棄
  chartInstances["shareChart"] = new Chart(ctx, {
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
        legend: { labels: { color: "#aaaaaa" } }, // 凡例の色
      },
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
        animateRotate: true, // 回転しながら表示
        animateScale: true, // 拡大しながら表示
      },
    },
  });
}

// ============================================
// ④ キャンペーンタイプ別ROAS比較（棒グラフ）
// Search・Display・Shopping・Videoの平均ROASを比較
// ============================================
function drawCampaignChart(data) {
  const campaignTypes = ["Search", "Display", "Shopping", "Video"];

  // キャンペーンタイプごとにROASの平均を計算
  const roasData = campaignTypes.map((type) => {
    const filtered = data.filter((row) => row.campaign_type === type);
    const avg =
      filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length;
    return Math.round(avg * 100) / 100; // 小数点2桁に丸める
  });

  const ctx = document.getElementById("campaignChart").getContext("2d");
  destroyChart("campaignChart"); // 既存グラフを破棄
  chartInstances["campaignChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: campaignTypes,
      datasets: [
        {
          label: "平均ROAS",
          data: roasData,
          backgroundColor: ["#34A853", "#FBBC05", "#EA4335", "#4285F4"], // 各タイプのカラー
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
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
      animation: { duration: 1000, easing: "easeOutQuart" },
    },
  });
}
