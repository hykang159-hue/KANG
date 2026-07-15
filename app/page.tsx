import BrandLineup from "./brand-lineup";

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="hero-court" aria-hidden="true" />
        <div className="hero-content">
          <p className="brand-mark">
            Ace<span>Line</span>
          </p>
          <p className="hero-copy">
            브랜드별로 정리한 테니스 라켓 라인업. 투어에서 쓰이는 대표 시리즈를
            빠르게 훑어보세요.
          </p>
          <div className="cta-group">
            <a className="cta cta-primary" href="#lineup">
              라인업 보기
            </a>
            <a className="cta cta-ghost" href="#lineup">
              브랜드 고르기
            </a>
          </div>
        </div>
      </header>

      <main>
        <BrandLineup />
      </main>

      <footer className="site-footer">
        AceLine · 스펙은 대표 모델 기준의 대략적인 가이드입니다.
      </footer>
    </>
  );
}
