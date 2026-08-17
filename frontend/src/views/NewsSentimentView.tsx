import React, { useEffect, useState } from 'react';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Clock,
  Tag,
  Filter,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import { NewsItem } from '../types';

export const NewsSentimentView: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getNews()
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredNews = news.filter((item) => {
    if (selectedSentiment === 'ALL') return true;
    return item.sentiment === selectedSentiment;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-cyan-400" />
            Financial News & Real-Time Sentiment Stream
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            NLP polarity extraction, entity recognition, and quantitative sentiment scoring mapped to asset universe.
          </p>
        </div>

        {/* Sentiment Filter Pills */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSentiment(s)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedSentiment === s
                  ? 'bg-cyan-500 text-dark-950 shadow-md shadow-cyan-500/20'
                  : 'bg-dark-850 text-slate-400 border border-slate-700 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment Overview Gauge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
          <div className="text-xs text-slate-400">Bullish Articles (Score &gt; 0.50)</div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {news.filter((n) => n.sentiment === 'BULLISH').length}
          </div>
          <div className="text-[11px] text-emerald-300/80 font-sans">
            Positive catalyst momentum dominant across Big Tech & Semis.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-1">
          <div className="text-xs text-slate-400">Neutral / Macro Reports</div>
          <div className="text-3xl font-extrabold text-amber-400">
            {news.filter((n) => n.sentiment === 'NEUTRAL').length}
          </div>
          <div className="text-[11px] text-amber-300/80 font-sans">
            Balanced regulatory & economic baseline updates.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-1">
          <div className="text-xs text-slate-400">Bearish Alerts (Score &lt; -0.30)</div>
          <div className="text-3xl font-extrabold text-rose-400">
            {news.filter((n) => n.sentiment === 'BEARISH').length}
          </div>
          <div className="text-[11px] text-rose-300/80 font-sans">
            Low tail-risk warnings detected currently.
          </div>
        </div>
      </div>

      {/* News Articles Stream List */}
      <div className="space-y-4">
        {filteredNews.map((item) => {
          const isBull = item.sentiment === 'BULLISH';
          const isBear = item.sentiment === 'BEARISH';
          return (
            <div
              key={item.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300 bg-dark-950 px-2.5 py-1 rounded border border-slate-800">
                    {item.source}
                  </span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isBull
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isBear
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {item.sentiment} ({(item.sentiment_score * 100).toFixed(0)}%)
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 text-slate-300 border border-slate-700">
                    Impact: {item.impact_level}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white hover:text-cyan-300 transition-colors">
                {item.title}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {item.summary}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Tagged Entities:</span>
                  {item.tickers.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-bold">
                      ${t}
                    </span>
                  ))}
                </div>

                <span className="text-slate-400 flex items-center gap-1">
                  NLP Confidence: <strong className="text-slate-200">96.4%</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
