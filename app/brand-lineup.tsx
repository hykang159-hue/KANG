"use client";

import { useState, type CSSProperties } from "react";
import { brands } from "./data/brands";

export default function BrandLineup() {
  const [activeBrandId, setActiveBrandId] = useState(brands[0].id);
  const activeBrand = brands.find((brand) => brand.id === activeBrandId) ?? brands[0];

  return (
    <section id="lineup" className="lineup-section">
      <div className="section-inner">
        <header className="section-header">
          <h2>브랜드 라인업</h2>
          <p>브랜드를 고르면 대표 시리즈와 스펙 요약을 보여줍니다.</p>
        </header>

        <div
          className="brand-tabs"
          role="tablist"
          aria-label="테니스 라켓 브랜드"
        >
          {brands.map((brand) => {
            const isActive = brand.id === activeBrandId;
            return (
              <button
                key={brand.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`brand-tab${isActive ? " is-active" : ""}`}
                style={{ "--brand-accent": brand.accent } as CSSProperties}
                onClick={() => setActiveBrandId(brand.id)}
              >
                {brand.name}
              </button>
            );
          })}
        </div>

        <div
          key={activeBrand.id}
          className="brand-panel"
          role="tabpanel"
          style={{ "--brand-accent": activeBrand.accent } as CSSProperties}
        >
          <div className="brand-intro">
            <p className="brand-origin">{activeBrand.origin}</p>
            <h3>{activeBrand.name}</h3>
            <p className="brand-summary">{activeBrand.summary}</p>
          </div>

          <ul className="racket-list">
            {activeBrand.lines.map((line, index) => (
              <li
                key={line.name}
                className="racket-row"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="racket-main">
                  <span className="racket-feel">{line.feel}</span>
                  <h4>{line.name}</h4>
                  <p>{line.tagline}</p>
                </div>
                <dl className="racket-specs">
                  <div>
                    <dt>무게</dt>
                    <dd>{line.weight}</dd>
                  </div>
                  <div>
                    <dt>헤드</dt>
                    <dd>{line.headSize}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
