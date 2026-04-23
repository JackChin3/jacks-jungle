import { X } from "lucide-react";

export function DetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${item.title} details`}>
      <article className="detail-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close details">
          <X size={18} />
        </button>
        <p className="eyebrow">{item.section}</p>
        <h2>{item.title}</h2>
        <p className="modal-role">{item.role}</p>
        <p className="modal-details">{item.details}</p>
        <div className="metric-row modal-metrics">
          {item.metrics.map((metric) => (
            <span key={metric}>{metric}</span>
          ))}
        </div>
        <ul>
          {item.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}
