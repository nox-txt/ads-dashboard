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
    const allData = results.data.filter((row) => row.platform);

    // ローディングを非表示にする
    document.getElementById("loading").style.display = "none";

    // 最初は全データで描画
    renderAll(allData);

    // フィルターボタンのクリック処理
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        // activeクラスを一旦全部外す
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        // クリックしたボタンにactiveクラスを付ける
        this.classList.add("active");

        // 選択したプラットフォームでデータを絞り込む
        const platform = this.dataset.platform;
        const filtered =
          platform === "all"
            ? allData
            : allData.filter((row) => row.platform === platform);

        // 絞り込んだデータで再描画
        renderAll(filtered);
      });
    });
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
      maintainAspectRatio: true, // アスペクト比を維持
      aspectRatio: 1.8, // 横：縦 = 1.8：1
      // ...既存のオプション
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
      maintainAspectRatio: true, // アスペクト比を維持
      aspectRatio: 1.8, // 横：縦 = 1.8：1
      // ...既存のオプション
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
          maxRotation: 45, // ラベルを45度傾ける
          minRotation: 45,
          maxTicksLimit: 6, // 表示するラベルの数を減らす
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
      maintainAspectRatio: true,
      aspectRatio: 1.5, // 円グラフは少し縦長に
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
      maintainAspectRatio: true, // アスペクト比を維持
      aspectRatio: 1.8, // 横：縦 = 1.8：1
      // ...既存のオプション
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

// 全グラフを再描画する関数
function renderAll(data) {
  drawKpiCards(data);
  drawRoasChart(data);
  drawTrendChart(data);
  drawCampaignChart(data);
  drawTable(data);
  updateComments(data); // 分析コメントを更新

  const shareCard = document.getElementById("shareChart").closest(".card");
  const activePlatform =
    document.querySelector(".filter-btn.active").dataset.platform;
  if (activePlatform === "all") {
    shareCard.style.display = "block";
    drawShareChart(data);
  } else {
    shareCard.style.display = "none";
  }
}

// ============================================
// テーブルの描画
// プラットフォーム別のサマリーを表形式で表示
// ソート機能付き
// ============================================
function drawTable(data) {
  const platforms = ["Google Ads", "Meta Ads", "TikTok Ads"];

  // プラットフォームごとに集計したデータを作成
  let tableData = platforms
    .map((platform) => {
      const filtered = data.filter((row) => row.platform === platform);
      if (filtered.length === 0) return null;

      return {
        platform,
        totalSpend: filtered.reduce((sum, row) => sum + row.ad_spend, 0),
        avgRoas:
          filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length,
        totalCv: filtered.reduce((sum, row) => sum + row.conversions, 0),
        avgCpa:
          filtered.reduce((sum, row) => sum + row.CPA, 0) / filtered.length,
      };
    })
    .filter(Boolean); // nullを除外

  // 現在のソート状態を管理
  let sortKey = null;
  let sortAsc = true;

  // テーブルを描画する内部関数
  function renderTable() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    // ソートが指定されている場合は並び替える
    if (sortKey) {
      tableData.sort((a, b) => {
        return sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
      });
    }

    // 行を生成
    tableData.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.platform}</td>
        <td>$${(row.totalSpend / 1000).toFixed(0)}K</td>
        <td>${row.avgRoas.toFixed(2)}</td>
        <td>${row.totalCv.toLocaleString()}</td>
        <td>$${row.avgCpa.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ヘッダークリックでソート
  const headers = document.querySelectorAll("#summaryTable thead th");
  const keys = [null, "totalSpend", "avgRoas", "totalCv", "avgCpa"];

  headers.forEach((th, i) => {
    // 既存のイベントを削除してから追加（重複防止）
    const newTh = th.cloneNode(true);
    th.parentNode.replaceChild(newTh, th);

    newTh.addEventListener("click", function () {
      if (keys[i] === null) return; // プラットフォーム列はソート不可

      // 同じ列をクリックした場合は昇順・降順を切り替える
      if (sortKey === keys[i]) {
        sortAsc = !sortAsc;
      } else {
        sortKey = keys[i];
        sortAsc = true;
      }

      // ヘッダーのクラスを更新
      document.querySelectorAll("#summaryTable thead th").forEach((h) => {
        h.classList.remove("asc", "desc");
      });
      this.classList.add(sortAsc ? "asc" : "desc");

      renderTable();
    });
  });

  // 初期描画
  renderTable();
}

// ============================================
// ダークモード切替
// ボタンクリックでlight/darkを切り替える
// ============================================
document.getElementById("themeToggle").addEventListener("click", function () {
  const body = document.body;

  if (body.classList.contains("light")) {
    // ライトモード → ダークモードに切り替え
    body.classList.remove("light");
    this.textContent = "☀️";
  } else {
    // ダークモード → ライトモードに切り替え
    body.classList.add("light");
    this.textContent = "🌙";
  }
});
// ============================================
// 分析コメントの更新
// データから自動でコメントを生成する
// ============================================
function updateComments(data) {
  const platforms = ["Google Ads", "Meta Ads", "TikTok Ads"];

  // プラットフォームごとの平均ROASを計算
  const roasMap = {};
  platforms.forEach((platform) => {
    const filtered = data.filter((row) => row.platform === platform);
    if (filtered.length === 0) return;
    roasMap[platform] =
      filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length;
  });

  // 最高ROASのプラットフォームを特定
  const bestPlatform = Object.entries(roasMap).sort((a, b) => b[1] - a[1])[0];

  // ROASグラフのコメント
  if (bestPlatform) {
    document.getElementById("roasComment").textContent =
      `💡 ${bestPlatform[0]} のROASが ${bestPlatform[1].toFixed(2)} と最も高く、費用対効果が優秀です。`;
  }

  // トレンドグラフのコメント
  const monthlyData = {};
  data.forEach((row) => {
    const month = row.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = 0;
    monthlyData[month] += row.ad_spend;
  });
  const months = Object.keys(monthlyData).sort();
  if (months.length >= 2) {
    const first = monthlyData[months[0]];
    const last = monthlyData[months[months.length - 1]];
    const diff = (((last - first) / first) * 100).toFixed(1);
    const trend = diff > 0 ? "増加" : "減少";
    document.getElementById("trendComment").textContent =
      `💡 期間全体で広告費は ${Math.abs(diff)}% ${trend}しています。`;
  }

  // 広告費シェアのコメント
  const spendMap = {};
  platforms.forEach((platform) => {
    const filtered = data.filter((row) => row.platform === platform);
    spendMap[platform] = filtered.reduce((sum, row) => sum + row.ad_spend, 0);
  });
  const totalSpend = Object.values(spendMap).reduce((a, b) => a + b, 0);
  const topSpend = Object.entries(spendMap).sort((a, b) => b[1] - a[1])[0];
  if (topSpend) {
    const share = ((topSpend[1] / totalSpend) * 100).toFixed(1);
    document.getElementById("shareComment").textContent =
      `💡 ${topSpend[0]} が広告費全体の ${share}% を占めています。`;
  }

  // キャンペーンタイプのコメント
  const campaignTypes = ["Search", "Display", "Shopping", "Video"];
  const campaignRoas = {};
  campaignTypes.forEach((type) => {
    const filtered = data.filter((row) => row.campaign_type === type);
    if (filtered.length === 0) return;
    campaignRoas[type] =
      filtered.reduce((sum, row) => sum + row.ROAS, 0) / filtered.length;
  });
  const bestCampaign = Object.entries(campaignRoas).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (bestCampaign) {
    document.getElementById("campaignComment").textContent =
      `💡 ${bestCampaign[0]} がROAS ${bestCampaign[1].toFixed(2)} と最も効率的なキャンペーンタイプです。`;
  }
}
