import React, { useState, useMemo, useRef } from 'react';
import { Offer, Deal } from './types';
import { DEMO_OFFERS, parseCsv, formatMoney, norm } from './utils/csvParser';
import {
  Upload,
  Search,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Store,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function App() {
  const [offers, setOffers] = useState<Offer[]>(DEMO_OFFERS);
  const [server, setServer] = useState<string>('Mobile 3');
  const [roiInput, setRoiInput] = useState<string>('10');
  const [feeInput, setFeeInput] = useState<string>('0');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Предложений в наборе данных: 6 • подходящих сделок: 3'
  );
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [showRawOffers, setShowRawOffers] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [confirmedDeals, setConfirmedDeals] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute deals based on current filters
  const deals = useMemo<Deal[]>(() => {
    const srv = server.trim();
    const minRoi = parseFloat(roiInput) || 0;
    const fee = parseFloat(feeInput) || 0;

    const grouped = new Map<string, Offer[]>();
    for (const o of offers) {
      if (srv && o.server.toLowerCase() !== srv.toLowerCase()) continue;
      const key = norm(o.item);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(o);
    }

    const calculatedDeals: Deal[] = [];
    grouped.forEach((list) => {
      let cheap: Offer | null = null;
      let buyer: Offer | null = null;

      for (const o of list) {
        if (o.side === 'sell' && (cheap === null || o.price < cheap.price)) {
          cheap = o;
        }
        if (o.side === 'buy' && (buyer === null || o.price > buyer.price)) {
          buyer = o;
        }
      }

      if (cheap && buyer) {
        const net = buyer.price * (1 - fee / 100);
        const profit = net - cheap.price;
        const roi = (profit / cheap.price) * 100;

        if (roi >= minRoi) {
          calculatedDeals.push({
            id: `${cheap.item}-${cheap.stall}-${buyer.stall}`,
            item: cheap.item,
            server: cheap.server,
            cheap,
            buyer,
            net,
            profit,
            roi,
          });
        }
      }
    });

    // Default sort by highest profit
    return calculatedDeals.sort((a, b) => b.profit - a.profit);
  }, [offers, server, roiInput, feeInput]);

  const handleRecalculate = () => {
    setStatusMessage(
      `Предложений в наборе данных: ${offers.length} • подходящих сделок: ${deals.length}`
    );
    setStatusType('info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { offers: loaded, error } = parseCsv(text, server.trim() || 'Mobile 3');
      if (error) {
        setStatusMessage(`Ошибка CSV: ${error}`);
        setStatusType('error');
      } else {
        setOffers(loaded);
        setStatusMessage(
          `Импортировано предложений: ${loaded.length}. Источник: выбранный CSV.`
        );
        setStatusType('success');
      }
    };
    reader.onerror = () => {
      setStatusMessage('Не удалось прочитать выбранный файл.');
      setStatusType('error');
    };
    reader.readAsText(file);
    // Reset file input so same file can be reloaded if needed
    e.target.value = '';
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const { offers: loaded, error } = parseCsv(pasteText, server.trim() || 'Mobile 3');
    if (error) {
      setStatusMessage(`Ошибка CSV: ${error}`);
      setStatusType('error');
    } else {
      setOffers(loaded);
      setStatusMessage(`Импортировано предложений: ${loaded.length}. Источник: вставка текста.`);
      setStatusType('success');
      setShowPasteModal(false);
      setPasteText('');
    }
  };

  const handleResetDemo = () => {
    setOffers(DEMO_OFFERS);
    setServer('Mobile 3');
    setRoiInput('10');
    setFeeInput('0');
    setStatusMessage('Демонстрационные данные восстановлены (6 предложений).');
    setStatusType('info');
    setConfirmedDeals({});
  };

  const downloadSampleCsv = () => {
    const sample = `server,item,stall,price,side,updated
Mobile 3,Аптечка,18,100000,sell,10:15
Mobile 3,Аптечка,7,125000,buy,10:20
Mobile 3,Кейс,15,500000,sell,10:05
Mobile 3,Кейс,21,590000,buy,10:18
Mobile 3,Материалы,12,75000,sell,09:55
Mobile 3,Материалы,9,82000,buy,10:12
Mobile 3,Наркотики,3,2500,sell,10:00
Mobile 3,Наркотики,11,3500,buy,10:25
Mobile 3,Гражданский талон,5,15000,sell,10:11
Mobile 3,Гражданский талон,2,18500,buy,10:14
Mobile 3,Семейный талон,28,45000,sell,10:02
Mobile 3,Семейный талон,19,55000,buy,10:22`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arizona_market_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleConfirmDeal = (id: string) => {
    setConfirmedDeals((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#1c222a] py-6 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-xl flex flex-col space-y-4">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Header Block */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-[#1c222a]">MARKET SNIPER</h1>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Arizona RP
            </span>
          </div>
          <p className="text-sm text-[#4a5568]">Arizona RP • аналитика рынка</p>
          <div className="mt-2 text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Данные ниже демонстрационные. Реальный источник цен ещё не подключён.</span>
          </div>
        </div>

        {/* Controls Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          {/* Server Input */}
          <div>
            <label className="block text-sm font-bold text-[#1c222a] mb-1">Сервер</label>
            <input
              type="text"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="Например, Mobile 3"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-[#1c222a]"
            />
          </div>

          {/* ROI and Fee Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1c222a] mb-1">
                Минимальная прибыль, %
              </label>
              <input
                type="number"
                step="any"
                value={roiInput}
                onChange={(e) => setRoiInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-[#1c222a]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1c222a] mb-1">
                Комиссия, %
              </label>
              <input
                type="number"
                step="any"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-[#1c222a]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-medium text-sm py-2.5 px-4 rounded-lg transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Импортировать CSV с ценами
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                title="Вставить CSV текст вручную"
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleRecalculate}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm py-2.5 px-4 rounded-lg transition-colors shadow-sm"
            >
              <Search className="w-4 h-4" />
              Найти выгодные предложения
            </button>

            {/* Helper tools row */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1 hover:text-slate-800 underline transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сбросить на демо
              </button>

              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1 hover:text-blue-600 underline transition-colors"
              >
                Скачать шаблон CSV
              </button>

              <button
                type="button"
                onClick={() => setShowRawOffers(!showRawOffers)}
                className="inline-flex items-center gap-1 hover:text-slate-800 underline transition-colors"
              >
                {showRawOffers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Все товары ({offers.length})
              </button>
            </div>
          </div>
        </div>

        {/* Status Line */}
        {statusMessage && (
          <div
            className={`text-xs px-3.5 py-2 rounded-lg border flex items-center gap-2 ${
              statusType === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : statusType === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {statusType === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
            {statusType === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
            {statusType === 'info' && <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Raw Offers Drawer (Collapsible) */}
        {showRawOffers && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800">
                Загруженные предложения ({offers.length})
              </h3>
              <span className="text-xs text-slate-500">Сервер: {server || 'Все'}</span>
            </div>
            {offers.length === 0 ? (
              <p className="text-xs text-slate-500">Нет загруженных предложений.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs pr-1">
                {offers.map((o, idx) => (
                  <div
                    key={o.id || idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{o.item}</span>
                      <span className="text-slate-400 ml-1.5">Лавка #{o.stall}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          o.side === 'sell'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {o.side === 'sell' ? 'Продажа' : 'Скупка'}
                      </span>
                      <span className="font-mono font-medium text-slate-700">
                        ${formatMoney(o.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Found Deals Header */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-[#1c222a]">Найденные предложения</h2>
            {deals.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {deals.length} {deals.length === 1 ? 'сделка' : deals.length < 5 ? 'сделки' : 'сделок'}
              </span>
            )}
          </div>

          {/* Results Container */}
          <div className="space-y-3">
            {deals.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-600 text-sm">
                <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-[#1c222a]">Подходящих сделок нет.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Импортируй данные с предложениями sell и buy или снизьте порог минимальной прибыли.
                </p>
              </div>
            ) : (
              deals.map((deal) => {
                const isConfirmed = !!confirmedDeals[deal.id];
                return (
                  <div
                    key={deal.id}
                    className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                      isConfirmed
                        ? 'border-emerald-300 ring-1 ring-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: Item name & quick confirm toggle */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
                      <div>
                        <div className="text-base font-bold text-[#1c222a] leading-tight">
                          {deal.item}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>Сервер: {deal.server}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleConfirmDeal(deal.id)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                          isConfirmed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                        }`}
                        title="Отметить проверку в лавке"
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isConfirmed ? 'text-emerald-600' : 'text-slate-400'}`} />
                        {isConfirmed ? 'Проверено' : 'Подтвердить'}
                      </button>
                    </div>

                    {/* Deal Details matching exact Android text structure */}
                    <div className="space-y-1.5 text-sm text-[#1c222a]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          Купить: <strong className="text-slate-900 font-semibold">${formatMoney(deal.cheap.price)}</strong>
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200">
                          лавка №{deal.cheap.stall}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          Скупка: <strong className="text-slate-900 font-semibold">${formatMoney(deal.buyer.price)}</strong>
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                          лавка №{deal.buyer.stall}
                        </span>
                      </div>

                      <div className="pt-2 mt-1 border-t border-dashed border-slate-200 flex flex-wrap items-baseline justify-between gap-1">
                        <div className="flex items-center gap-1 font-bold text-emerald-700">
                          <DollarSign className="w-4 h-4 -mr-1" />
                          <span>Чистая прибыль: ${formatMoney(deal.profit)}</span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>доходность {deal.roi.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 pt-1">
                        Обновление: {deal.cheap.updated} / {deal.buyer.updated}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-2 pb-6 text-center">
          <p className="text-xs text-slate-500 leading-relaxed">
            Покупку и продажу подтверждай вручную. Цена может измениться до проверки лавки.
          </p>
        </div>
      </div>

      {/* Manual Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Вставка CSV данных</h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Вставьте строки с колонками <code>item, price, side</code> (или <code>товар, цена, тип</code>).
              Также поддерживаются <code>server, stall, updated</code>.
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`item,price,side,stall,server\nАптечка,95000,sell,12,Mobile 3\nАптечка,120000,buy,4,Mobile 3\nСкин CJ,150кк,sell,1,Mobile 3\nСкин CJ,170кк,buy,10,Mobile 3`}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Импортировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
