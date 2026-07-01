// ============================================
// グラフインスタンスの管理
// 同じcanvasに複数のグラフが描画されるのを防ぐ
// ============================================
const chartInstances = {};

// 通貨設定（デフォルト: $）
let currencySymbol = "$";

// 金額フォーマット関数
// ¥の場合はカンマ区切り、$の場合はK略表記
function formatMoney(value) {
  if (currencySymbol === "¥") {
    return "¥" + Math.round(value).toLocaleString("ja-JP");
  }
  const sym = currencySymbol || "";
  if (value >= 1000) return sym + (value / 1000).toFixed(1) + "K";
  return sym + value.toFixed(0);
}

// K略表記専用（テーブルの広告費列など）
function formatMoneyShort(value) {
  if (currencySymbol === "¥") {
    return "¥" + Math.round(value).toLocaleString("ja-JP");
  }
  const sym = currencySymbol || "";
  return sym + (value / 1000).toFixed(0) + "K";
}

// グラフを破棄してから再生成する関数
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
}

// 通貨ボタンのイベント登録
document.querySelectorAll(".currency-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".currency-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currencySymbol = btn.dataset.currency;
  });
});

// ============================================
// KPIカードの描画
// 総広告費・平均ROAS・総CV数・平均CPAを表示
// ============================================
function drawKpiCards(data) {
  // 総広告費（全行のad_spendを合計してM（百万）単位に変換）
  const totalSpend = data.reduce((sum, row) => sum + row.ad_spend, 0);
  document.getElementById("totalSpend").textContent =
    formatMoney(totalSpend);

  // 平均ROAS（全行のROASを合計して件数で割る）
  const avgRoas = data.reduce((sum, row) => sum + row.ROAS, 0) / data.length;
  document.getElementById("avgRoas").textContent = avgRoas.toFixed(2) + "x";

  // 総CV数（全行のconversionsを合計してカンマ区切りで表示）
  const totalConversions = data.reduce((sum, row) => sum + row.conversions, 0);
  document.getElementById("totalConversions").textContent =
    totalConversions.toLocaleString();

  // 平均CPA（全行のCPAを合計して件数で割る）
  const avgCpa = data.reduce((sum, row) => sum + row.CPA, 0) / data.length;
  document.getElementById("avgCpa").textContent = (currencySymbol || "") + avgCpa.toFixed(0);
}

// ============================================
// CSVの読み込み（1回だけ読み込んで全グラフに使い回す）
// ============================================
// ============================================
// プラットフォーム名の正規化
// CSV内の表記ゆれをGoogle Ads / Meta Ads / TikTok Adsに統一
// ============================================
function normalizePlatform(value) {
  const v = String(value).toLowerCase();
  if (/google|adwords|gads|g_ads/.test(v)) return "Google Ads";
  if (/meta|facebook|fb|instagram|ig/.test(v)) return "Meta Ads";
  if (/tiktok|tik.?tok|tt_ads/.test(v)) return "TikTok Ads";
  return value;
}

// CSV読み込み前はダッシュボードを非表示にする
document.getElementById("loading").style.display = "none";
document.getElementById("dashboard").style.display = "none";


// ============================================
// ① プラットフォーム別ROAS比較（棒グラフ）
// Google・Meta・TikTokの平均ROASを比較
// ============================================
function setCardVisible(canvasId, visible) {
  const card = document.getElementById(canvasId).closest(".card");
  card.style.display = visible ? "block" : "none";
}

function drawRoasChart(data) {
  // 固定ではなくデータから動的に取得
  const platforms = [...new Set(data.map((row) => row.platform))].filter(
    Boolean,
  );

  if (platforms.length < 2) {
    setCardVisible("roasChart", false);
    return;
  }
  setCardVisible("roasChart", true);

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
// 日付文字列から "YYYY-MM" を返すヘルパー
// YYYY-MM-DD / DD-MM-YYYY / MM/DD/YYYY など複数フォーマットに対応
// ============================================
function parseMonthKey(dateStr) {
  const s = String(dateStr).trim();
  // YYYY-MM-DD または YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    return s.substring(0, 7).replace("/", "-");
  }
  // DD-MM-YYYY または DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const parts = s.split(/[-/]/);
    return `${parts[2]}-${parts[1].padStart(2, "0")}`;
  }
  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split("/");
    return `${parts[2]}-${parts[0].padStart(2, "0")}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.substring(0, 4)}-${s.substring(4, 6)}`;
  }
  return null;
}

// 日付文字列を input[type=date] 用の YYYY-MM-DD に変換
function toISODate(dateStr) {
  const s = String(dateStr).trim();
  // すでに YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");
  // DD-MM-YYYY または DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const parts = s.split(/[-/]/);
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split("/");
    return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
  }
  return s;
}

// ============================================
// ② 月別広告費トレンド（折れ線グラフ）
// 月ごとの総広告費の推移を表示
// ============================================
function drawTrendChart(data) {
  // 月ごとに広告費を集計
  const monthlyData = {};
  data.forEach((row) => {
    if (!row.date) return; // 日付がなければスキップ
    const month = parseMonthKey(row.date); // 日付から年月を抜き出す（例：2024-01）
    if (!month) return;
    if (!monthlyData[month]) monthlyData[month] = 0;
    monthlyData[month] += row.ad_spend; // 月ごとに広告費を加算
  });

  const months = Object.keys(monthlyData).sort(); // 月を昇順に並べる

  if (months.length < 2) {
    setCardVisible("trendChart", false);
    return;
  }
  setCardVisible("trendChart", true);

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
  const platforms = [...new Set(data.map((row) => row.platform))].filter(
    Boolean,
  );

  if (platforms.length < 2) {
    setCardVisible("shareChart", false);
    return;
  }
  setCardVisible("shareChart", true);

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
function normalizeCampaignName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function drawCampaignChart(data) {
  const campaignTypes = [
    ...new Set(data.map((row) => row.campaign_type)),
  ].filter(Boolean);

  // 先頭6文字で比較 — 表記ゆれ（スペース・タイポ）を吸収して実質同一か判定
  const prefixes = new Set(campaignTypes.map((t) => normalizeCampaignName(t).substring(0, 6)));
  if (campaignTypes.length < 2 || prefixes.size < 2) {
    setCardVisible("campaignChart", false);
    return;
  }
  setCardVisible("campaignChart", true);

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
  updateComments(data);

  const activePlatform =
    document.querySelector(".filter-btn.active").dataset.platform;
  const uniquePlatforms = [...new Set(data.map((r) => r.platform))].filter(Boolean);
  const isSingle = activePlatform !== "all" || uniquePlatforms.length <= 1;
  const platformLabel = isSingle
    ? (activePlatform !== "all" ? activePlatform : uniquePlatforms[0] || "")
    : "";

  if (isSingle) {
    setCardVisible("shareChart", false);
    drawDailyChart(data, platformLabel);
    drawCampaignPerfTable(data, platformLabel);
  } else {
    drawShareChart(data);
    document.getElementById("dailyCard").style.display = "none";
    document.getElementById("campaignPerfCard").style.display = "none";
  }
}

// ============================================
// テーブルの描画
// プラットフォーム別のサマリーを表形式で表示
// ソート機能付き
// ============================================
function drawTable(data) {
  // 固定ではなくデータから動的に取得
  const platforms = [...new Set(data.map((row) => row.platform))].filter(
    Boolean,
  );
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
        <td>${formatMoneyShort(row.totalSpend)}</td>
        <td>${row.totalCv.toLocaleString()}</td>
        <td>${(currencySymbol || "") + row.avgCpa.toFixed(0)}</td>
        <td>${row.avgRoas.toFixed(2)}x</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ヘッダークリックでソート
  const headers = document.querySelectorAll("#summaryTable thead th");
  const keys = [null, "totalSpend", "totalCv", "avgCpa", "avgRoas"];

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
// ⑤ 日別パフォーマンス（単一プラットフォーム時のみ・タブ切り替え式）
// 全指標を初日=100に正規化して1グラフで比較
// ============================================
function drawDailyChart(data, platformName) {
  const card = document.getElementById("dailyCard");

  // 日別集計
  const dailyData = {};
  data.forEach((row) => {
    if (!row.date) return;
    if (!parseMonthKey(row.date)) return;
    const day = String(row.date).trim();
    if (!dailyData[day]) dailyData[day] = { spend: 0, conversions: 0, clicks: 0, revenue: 0 };
    dailyData[day].spend      += row.ad_spend;
    dailyData[day].conversions += row.conversions;
    dailyData[day].clicks     += row.clicks || 0;
    dailyData[day].revenue    += row.revenue || 0;
  });

  const allDays = Object.keys(dailyData).sort();
  if (allDays.length < 2) { card.style.display = "none"; return; }

  card.style.display = "block";
  document.getElementById("dailyTitle").textContent =
    `${platformName} — 日別パフォーマンス推移`;

  // 日付ピッカーの初期値・範囲をデータに合わせてセット
  const minDate = toISODate(allDays[0]);
  const maxDate = toISODate(allDays[allDays.length - 1]);
  const fromInput = document.getElementById("dateFrom");
  const toInput   = document.getElementById("dateTo");
  fromInput.min = minDate;
  fromInput.max = maxDate;
  toInput.min   = minDate;
  toInput.max   = maxDate;
  fromInput.value = minDate;
  toInput.value   = maxDate;

  function getFilteredDays() {
    const from = document.getElementById("dateFrom").value;
    const to   = document.getElementById("dateTo").value;
    return allDays.filter((d) => {
      const iso = toISODate(d);
      return (!from || iso >= from) && (!to || iso <= to);
    });
  }

  const metrics = [
    {
      label: "広告費", color: "#4285F4", unit: "money",
      calc: (d) => +dailyData[d].spend.toFixed(2),
      tick: (v) => formatMoney(v),
    },
    {
      label: "CPA", color: "#EA4335", unit: "money",
      calc: (d) => {
        const { spend, conversions } = dailyData[d];
        return conversions > 0 ? +(spend / conversions).toFixed(2) : null;
      },
      tick: (v) => formatMoney(v),
    },
    {
      label: "CVR", color: "#34A853", unit: "%",
      calc: (d) => {
        const { clicks, conversions } = dailyData[d];
        return clicks > 0 ? +((conversions / clicks) * 100).toFixed(2) : null;
      },
      tick: (v) => `${v}%`,
    },
    {
      label: "ROAS", color: "#FBBC05", unit: "x",
      calc: (d) => {
        const { spend, revenue } = dailyData[d];
        return spend > 0 && revenue > 0 ? +(revenue / spend).toFixed(2) : null;
      },
      tick: (v) => `${v}`,
    },
  ];

  let activeIndex = 0;

  function buildChart(idx) {
    const m = metrics[idx];
    const days = getFilteredDays();
    const values = days.map((d) => m.calc(d));
    const pointRadius = days.length > 30 ? 0 : 3;

    destroyChart("dailyChart");
    const ctx = document.getElementById("dailyChart").getContext("2d");
    chartInstances["dailyChart"] = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: [{
          label: m.label,
          data: values,
          borderColor: m.color,
          backgroundColor: m.color + "18",
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          spanGaps: true,
          pointRadius,
        }],
      },
      options: {
        maintainAspectRatio: true,
        aspectRatio: 3,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(20,24,40,0.95)",
            borderColor: m.color,
            borderWidth: 1,
            padding: 12,
            titleColor: "#ffffff",
            bodyColor: "#cccccc",
            titleFont: { size: 13 },
            bodyFont: { size: 14, weight: "bold" },
            callbacks: {
              title: (items) => items[0]?.label ?? "",
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null) return null;
                let formatted;
                if (m.unit === "money") {
                  formatted = formatMoney(v);
                } else if (m.unit === "%") {
                  formatted = v + "%";
                } else if (m.unit === "x") {
                  formatted = v + "x";
                } else {
                  formatted = String(v);
                }
                return `  ${m.label}：${formatted}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#aaaaaa", callback: m.tick },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#aaaaaa", maxRotation: 45, minRotation: 45, maxTicksLimit: 10 },
          },
        },
        animation: { duration: 600, easing: "easeOutQuart" },
      },
    });
  }

  buildChart(activeIndex);

  // タブ切り替え（単一選択）
  document.querySelectorAll(".daily-tab").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.classList.toggle("active", Number(newBtn.dataset.index) === activeIndex);
    newBtn.addEventListener("click", () => {
      activeIndex = Number(newBtn.dataset.index);
      document.querySelectorAll(".daily-tab").forEach((b) =>
        b.classList.toggle("active", Number(b.dataset.index) === activeIndex)
      );
      buildChart(activeIndex);
    });
  });

  // 日付フィルター（重複登録を防ぐためクローンで差し替え）
  function rewire(id, handler) {
    const el = document.getElementById(id);
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener("change", handler);
    return clone;
  }
  rewire("dateFrom", () => buildChart(activeIndex));
  rewire("dateTo",   () => buildChart(activeIndex));
  const resetBtn = document.getElementById("dateReset").cloneNode(true);
  document.getElementById("dateReset").parentNode.replaceChild(resetBtn, document.getElementById("dateReset"));
  resetBtn.addEventListener("click", () => {
    document.getElementById("dateFrom").value = minDate;
    document.getElementById("dateTo").value   = maxDate;
    buildChart(activeIndex);
  });

  const spendValues = allDays.map((d) => metrics[0].calc(d));
  const maxDay = allDays[spendValues.indexOf(Math.max(...spendValues))];
  document.getElementById("dailyComment").textContent =
    `💡 ${maxDay} が最も広告費の高い日です。`;
}

// ============================================
// ⑥ キャンペーン別パフォーマンス（単一プラットフォーム時のみ表示）
// ============================================
function drawCampaignPerfTable(data, platformName) {
  const card = document.getElementById("campaignPerfCard");

  // 日付があるデータからmin/maxを取得
  const datesInData = data
    .map((row) => row.date ? toISODate(String(row.date).trim()) : null)
    .filter(Boolean)
    .sort();

  const hasDate = datesInData.length > 0;
  const minDate = hasDate ? datesInData[0] : "";
  const maxDate = hasDate ? datesInData[datesInData.length - 1] : "";

  // 日付ピッカーの初期化
  if (hasDate) {
    const fromEl = document.getElementById("campDateFrom");
    const toEl   = document.getElementById("campDateTo");
    fromEl.min = minDate; fromEl.max = maxDate; fromEl.value = minDate;
    toEl.min   = minDate; toEl.max   = maxDate; toEl.value   = maxDate;
  }
  document.querySelector("#campaignPerfCard .date-range").style.display =
    hasDate ? "flex" : "none";

  function getFilteredData() {
    if (!hasDate) return data;
    const from = document.getElementById("campDateFrom").value;
    const to   = document.getElementById("campDateTo").value;
    return data.filter((row) => {
      if (!row.date) return true;
      const iso = toISODate(String(row.date).trim());
      return (!from || iso >= from) && (!to || iso <= to);
    });
  }

  let campSortKey = "avgRoas";
  let campSortAsc = false;

  const campSortKeys = [null, "totalSpend", "totalCv", "avgCpa", "totalImpressions", "totalClicks", "avgCvr", "totalRevenue", "avgRoas"];

  function renderTable() {
    const filtered = getFilteredData();
    const campaignTypes = [...new Set(filtered.map((row) => row.campaign_type))].filter(Boolean);

    if (campaignTypes.length === 0) {
      card.style.display = "none";
      return;
    }
    card.style.display = "block";
    document.getElementById("campaignPerfTitle").textContent =
      `${platformName} — キャンペーン別 パフォーマンス`;

    let rows = campaignTypes.map((type) => {
      const rows = filtered.filter((row) => row.campaign_type === type);
      return {
        type,
        totalImpressions: rows.reduce((sum, r) => sum + (r.impressions || 0), 0),
        totalClicks:      rows.reduce((sum, r) => sum + (r.clicks || 0), 0),
        totalSpend:       rows.reduce((sum, r) => sum + r.ad_spend, 0),
        avgRoas:          rows.reduce((sum, r) => sum + r.ROAS, 0) / rows.length,
        totalCv:          rows.reduce((sum, r) => sum + r.conversions, 0),
        avgCpa:           rows.reduce((sum, r) => sum + r.CPA, 0) / rows.length,
        avgCvr:           rows.reduce((sum, r) => sum + (r.CVR || 0), 0) / rows.length,
        totalRevenue:     rows.reduce((sum, r) => sum + (r.revenue || 0), 0),
      };
    });

    if (campSortKey) {
      rows.sort((a, b) => campSortAsc ? a[campSortKey] - b[campSortKey] : b[campSortKey] - a[campSortKey]);
    } else {
      rows.sort((a, b) => campSortAsc ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type));
    }

    // ヘッダーの矢印を更新
    const thead = document.querySelector("#campaignPerfTable thead tr");
    thead.querySelectorAll("th").forEach((th, i) => {
      th.classList.remove("asc", "desc");
      const key = campSortKeys[i];
      if (key === campSortKey || (i === 0 && campSortKey === null)) {
        th.classList.add(campSortAsc ? "asc" : "desc");
      }
    });

    const tbody = document.getElementById("campaignPerfBody");
    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const imp = row.totalImpressions > 0 ? row.totalImpressions.toLocaleString() : "-";
      const clk = row.totalClicks > 0 ? row.totalClicks.toLocaleString() : "-";
      const cvr = row.avgCvr > 0 ? (row.avgCvr * 100).toFixed(2) + "%" : "-";
      const rev = row.totalRevenue > 0 ? formatMoneyShort(row.totalRevenue) : "-";
      tr.innerHTML = `
        <td>${row.type}</td>
        <td>${formatMoneyShort(row.totalSpend)}</td>
        <td>${row.totalCv.toLocaleString()}</td>
        <td>${(currencySymbol || "") + row.avgCpa.toFixed(0)}</td>
        <td>${imp}</td>
        <td>${clk}</td>
        <td>${cvr}</td>
        <td>${rev}</td>
        <td>${row.avgRoas.toFixed(2)}x</td>
      `;
      tbody.appendChild(tr);
    });

    const best = rows.reduce((a, b) => a.avgRoas > b.avgRoas ? a : b);
    document.getElementById("campaignPerfComment").textContent =
      `💡 ${best.type} がROAS ${best.avgRoas.toFixed(2)}x で最も効率的です。`;
  }

  renderTable();

  // ヘッダークリックでソート
  const thead = document.querySelector("#campaignPerfTable thead tr");
  const newThead = thead.cloneNode(true);
  thead.parentNode.replaceChild(newThead, thead);
  newThead.querySelectorAll("th").forEach((th, i) => {
    th.style.cursor = "pointer";
    th.style.userSelect = "none";
    th.addEventListener("click", () => {
      const key = campSortKeys[i];
      if (campSortKey === key || (i === 0 && campSortKey === null)) {
        campSortAsc = !campSortAsc;
      } else {
        campSortKey = key;
        campSortAsc = false;
      }
      renderTable();
    });
  });

  // 日付フィルターのイベント（重複防止のためクローン差し替え）
  ["campDateFrom", "campDateTo"].forEach((id) => {
    const el = document.getElementById(id);
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener("change", renderTable);
  });
  const resetBtn = document.getElementById("campDateReset").cloneNode(true);
  document.getElementById("campDateReset").parentNode.replaceChild(
    resetBtn, document.getElementById("campDateReset")
  );
  resetBtn.addEventListener("click", () => {
    document.getElementById("campDateFrom").value = minDate;
    document.getElementById("campDateTo").value   = maxDate;
    renderTable();
  });
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
  const platforms = [...new Set(data.map((row) => row.platform))].filter(
    Boolean,
  );

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
      `💡 ${bestPlatform[0]} のROASが ${bestPlatform[1].toFixed(2)}x と最も高く、費用対効果が優秀です。`;
  }

  // トレンドグラフのコメント
  const monthlyData = {};
  data.forEach((row) => {
    if (!row.date) return; // 日付がなければスキップ
    const month = parseMonthKey(row.date);
    if (!month) return;
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
  const campaignTypes = [
    ...new Set(data.map((row) => row.campaign_type)),
  ].filter(Boolean);
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
      `💡 ${bestCampaign[0]} がROAS ${bestCampaign[1].toFixed(2)}x と最も効率的なキャンペーンタイプです。`;
  }
}
// ============================================
// CSVアップロード処理
// カラムを自動検出してマッピング画面を表示
// ============================================

let parsedCsvData = null;

document.getElementById("csvUpload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      parsedCsvData = results.data.filter((row) =>
        Object.values(row).some((v) => v !== null && v !== ""),
      );

      const columns = Object.keys(results.data[0] || {});

      const autoMatch = {
        "map-platform": [
          "platform",
          "媒体",
          "channel",
          "source",
          "AdvertisingPlatform",
          "media",
          "publisher",
          "network",
          "ad_platform",
          "site",
        ],
        "map-spend": [
          "ad_spend",
          "spend",
          "cost",
          "費用",
          "広告費",
          "AdSpend",
          "budget",
          "amount_spent",
          "total_cost",
          "investment",
          "expenditure",
          "ad_cost",
          "marketing_spend",
          "予算",
        ],
        "map-date": [
          "date",
          "日付",
          "day",
          "month",
          "year",
          "timestamp",
          "created_at",
          "updated_at",
          "report_date",
          "start_date",
          "end_date",
          "period",
          "week",
          "quarter",
          "datetime",
          "time",
          "ad_date",
          "ad date",
          "date_ad",
          "日時",
          "掲載日",
          "実施日",
        ],
        "map-campaign": [
          "campaign_type",
          "campaign",
          "type",
          "キャンペーン",
          "CampaignType",
          "campaign_name",
          "ad_type",
          "ad_format",
          "objective",
          "goal",
          "campaign_objective",
          "ad_group",
          "category",
        ],
        "map-conversions": [
          "conversions",
          "cv",
          "conversion",
          "CV数",
          "Conversion",
          "purchases",
          "orders",
          "leads",
          "signups",
          "installs",
          "sales",
          "transactions",
          "goals",
          "results",
          "成果",
          "購入数",
        ],
        "map-revenue": [
          "revenue",
          "売上",
          "amount",
          "income",
          "total_revenue",
          "gross_revenue",
          "net_revenue",
          "earnings",
          "total_sales",
          "gmv",
          "売上金額",
          "収益",
          "sale_amount",
          "sales_amount",
          "sales amount",
        ],
        "map-impressions": [
          "impressions",
          "impression",
          "表示回数",
          "インプレッション",
          "imp",
          "imps",
          "views",
          "reach",
          "Impressions",
        ],
        "map-clicks": [
          "clicks",
          "click",
          "クリック数",
          "クリック",
          "Clicks",
          "click_count",
          "total_clicks",
          "link_clicks",
        ],
      };

      const mapIds = Object.keys(autoMatch);

      mapIds.forEach((id) => {
        const select = document.getElementById(id);
        const isRequired = ["map-spend", "map-conversions"].includes(id);

        if (id === "map-platform") {
          // プラットフォームは固定3択 + CSVカラムの両方を提供
          select.innerHTML = `
            <option value="">-- なし --</option>
            <optgroup label="媒体を直接指定">
              <option value="__fixed__Google Ads">Google Ads</option>
              <option value="__fixed__Meta Ads">Meta Ads</option>
              <option value="__fixed__TikTok Ads">TikTok Ads</option>
            </optgroup>
            <optgroup label="CSVカラムから取得">
            </optgroup>
          `;
          const colGroup = select.querySelector('optgroup[label="CSVカラムから取得"]');
          let columnMatched = false;
          columns.forEach((col) => {
            const opt = document.createElement("option");
            opt.value = col;
            opt.textContent = col;
            const matches = autoMatch["map-platform"];
            if (matches.some((m) => col.toLowerCase() === m.toLowerCase())) {
              opt.selected = true;
              columnMatched = true;
            }
            colGroup.appendChild(opt);
          });

          // カラムが一致しなければファイル名から推定
          if (!columnMatched) {
            const fname = file.name.toLowerCase();
            if (/google|adwords|gads/.test(fname)) {
              select.value = "__fixed__Google Ads";
            } else if (/meta|facebook|fb|instagram/.test(fname)) {
              select.value = "__fixed__Meta Ads";
            } else if (/tiktok/.test(fname)) {
              select.value = "__fixed__TikTok Ads";
            }
          }
        } else {
          select.innerHTML = isRequired
            ? '<option value="">-- 選択してください --</option>'
            : '<option value="">-- なし --</option>';

          columns.forEach((col) => {
            const option = document.createElement("option");
            option.value = col;
            option.textContent = col;
            const matches = autoMatch[id] || [];
            if (matches.some((m) => col.toLowerCase() === m.toLowerCase())) {
              option.selected = true;
            }
            select.appendChild(option);
          });
        }
      });

      // マッピングエリアを表示
      document.getElementById("mappingArea").style.display = "block";
    },
    error: function () {
      alert("CSVの読み込みに失敗しました。");
    },
  });
  this.value = "";
});

// ============================================
// マッピング適用処理
// ============================================
document.getElementById("applyMapping").addEventListener("click", function () {
  if (!parsedCsvData) return;

  const mapping = {
    platform: document.getElementById("map-platform").value,
    ad_spend: document.getElementById("map-spend").value,
    date: document.getElementById("map-date").value,
    campaign_type: document.getElementById("map-campaign").value,
    conversions: document.getElementById("map-conversions").value,
    revenue: document.getElementById("map-revenue").value,
    impressions: document.getElementById("map-impressions").value,
    clicks: document.getElementById("map-clicks").value,
  };

  // 必須カラムのチェック
  if (!mapping.ad_spend || !mapping.conversions) {
    alert("広告費とCV数は必須です。");
    return;
  }

  // データを変換
  const mappedData = parsedCsvData
    .map((row) => {
      const spend = Number(
        String(row[mapping.ad_spend]).replace("$", "").replace(",", ""),
      );
      const conversions = mapping.conversions
        ? Number(row[mapping.conversions]) || 0
        : 0;
      const revenue = mapping.revenue
        ? Number(
            String(row[mapping.revenue]).replace("$", "").replace(",", ""),
          ) || 0
        : 0;

      // ROAS・CPA・CVRはすべて自動計算
      const roas = revenue > 0 && spend > 0 ? revenue / spend : 0;
      const cpa = conversions > 0 && spend > 0 ? spend / conversions : 0;
      const clicks = mapping.clicks ? Number(row[mapping.clicks]) || 0 : 0;
      const cvr = clicks > 0 && conversions > 0 ? conversions / clicks : 0;

      return {
        date: mapping.date ? String(row[mapping.date] || "") : "",
        platform: mapping.platform
          ? mapping.platform.startsWith("__fixed__")
            ? mapping.platform.replace("__fixed__", "")
            : normalizePlatform(row[mapping.platform] || "")
          : "",
        campaign_type: mapping.campaign_type
          ? String(row[mapping.campaign_type] || "Unknown")
          : "Unknown",
        ad_spend: spend,
        conversions: conversions,
        revenue: revenue,
        ROAS: roas,
        CPA: cpa,
        CVR: cvr,
        impressions: mapping.impressions ? Number(row[mapping.impressions]) || 0 : 0,
        clicks: clicks,
      };
    })
    .filter((row) => row.ad_spend > 0); // 広告費が0より大きい行だけ残す

  console.log("mappedData length:", mappedData.length);
  console.log("mappedData[0]:", mappedData[0]);

  // ダッシュボードを表示してグラフを更新
  document.getElementById("dashboard").style.display = "block";
  renderAll(mappedData);

  // フィルターボタンを動的に更新（プラットフォームが2種類以上の時のみ個別ボタンを表示）
  const platforms = [...new Set(mappedData.map((row) => row.platform))].filter(Boolean);
  const filterArea = document.querySelector(".filter-area");
  filterArea.innerHTML =
    '<button class="filter-btn active" data-platform="all">全て</button>';
  if (platforms.length >= 2) {
    platforms.forEach((platform) => {
      const btn = document.createElement("button");
      btn.className = "filter-btn";
      btn.dataset.platform = platform;
      btn.textContent = platform;
      filterArea.appendChild(btn);
    });
  }

  // フィルターのイベントを再登録
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      const platform = this.dataset.platform;
      const filtered =
        platform === "all"
          ? mappedData
          : mappedData.filter((row) => row.platform === platform);
      renderAll(filtered);
    });
  });

  // マッピングエリアを非表示
  document.getElementById("mappingArea").style.display = "none";
});
