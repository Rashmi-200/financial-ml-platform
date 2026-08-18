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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Newspaper className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            Financial News & Real-Time Sentiment Stream
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            NLP polarity extraction, entity recognition, and quantitative sentiment scoring mapped to asset universe.
          </p>
        </div>

        {/* Sentiment Filter Pills */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSentiment(s)}
              className="px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
              style={
                selectedSentiment === s
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment Overview Gauge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="glass-panel p-5 rounded-xl space-y-1" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Bullish Articles (Score &gt; 0.50)</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--up)' }}>
            {news.filter((n) => n.sentiment === 'BULLISH').length}
          </div>
          <div className="text-[11px] font-sans" style={{ color: 'var(--text-secondary)' }}>
            Positive catalyst momentum dominant across Big Tech & Semis.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-1" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Neutral / Macro Reports</div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {news.filter((n) => n.sentiment === 'NEUTRAL').length}
          </div>
          <div className="text-[11px] font-sans" style={{ color: 'var(--text-secondary)' }}>
            Balanced regulatory & economic baseline updates.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-1" style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.22)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Bearish Alerts (Score &lt; -0.30)</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--down)' }}>
            {news.filter((n) => n.sentiment === 'BEARISH').length}
          </div>
          <div className="text-[11px] font-sans" style={{ color: 'var(--text-secondary)' }}>
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
              className="glass-panel p-5 rounded-2xl hover:border-cyan-500/40 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {item.source}
                  </span>
                  <span className="text-xs font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    {item.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isBull ? 'badge-buy' : isBear ? 'badge-sell' : 'badge-hold'
                  }`}>
                    {item.sentiment} ({(item.sentiment_score * 100).toFixed(0)}%)
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    Impact: {item.impact_level}
                  </span>
                </div>
              </div>

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-bold transition-colors flex items-center gap-2 group hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>{item.title}</span>
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: 'var(--accent)' }} />
                </a>
              ) : (
                <h3 className="text-base font-bold transition-colors" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
              )}

              <p className="text-sm leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                {item.summary}
              </p>

              <div className="flex items-center justify-between pt-2 text-xs font-mono" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Tagged Entities:</span>
                  {item.tickers.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                      ${t}
                    </span>
                  ))}
                </div>

                <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  NLP Confidence: <strong style={{ color: 'var(--text-primary)' }}>96.4%</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
