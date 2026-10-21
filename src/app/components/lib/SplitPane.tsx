import { type ReactElement, useLayoutEffect, useRef } from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

interface SplitPaneProps {
  left: ReactElement;
  right: ReactElement;
  // Keeps the whole sidebar on screen, letting its list (see .sidebar-scroll-list) scroll on its own
  fitSidebarIntoViewport?: boolean;
}

export default function SplitPane({ left, right, fitSidebarIntoViewport }: SplitPaneProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (fitSidebarIntoViewport) {
      return fitIntoViewport(rowRef.current!, mainRef.current!, sidebarRef.current!);
    }
  }, [fitSidebarIntoViewport]);

  return (
    <Container fluid={true}>
      <Row ref={rowRef} style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col xs={10} md={10}>
          <div ref={mainRef}>{left}</div>
        </Col>
        <Col xs={2} md={2}>
          <div ref={sidebarRef} className={`bs-docs-sidebar${fitSidebarIntoViewport ? ' fits-viewport' : ''}`}>
            {right}
          </div>
        </Col>
      </Row>
    </Container>
  );
}

// Caps the height of the sticky sidebar to the space between its top and the bottom of the viewport - or of the
// report, near the end of the page, so that the sidebar isn't pushed up out of view there. Recomputed as the page
// scrolls or resizes. The cap must never depend on the sidebar's own height, or capping it could change the page's
// height and scroll position, and with them the cap again:
//   - Where the report is longer than the sidebar, the report alone makes up the page's height.
//   - Where it's shorter, the sidebar ends where the page then just fills the viewport, which leaves nothing to
//     scroll.
// Returns the cleanup function.
function fitIntoViewport(row: HTMLElement, main: HTMLElement, sidebar: HTMLElement) {
  const update = () => {
    const { top, marginBottom } = getComputedStyle(sidebar);
    const sidebarTop = Math.max(sidebar.parentElement!.getBoundingClientRect().top, parseFloat(top));
    const spaceBelowRow = document.documentElement.scrollHeight - window.scrollY - row.getBoundingClientRect().bottom;
    const bottom = Math.min(
      window.innerHeight,
      Math.max(main.getBoundingClientRect().bottom, window.innerHeight - spaceBelowRow)
    );
    const maxHeight = `${Math.floor(bottom - parseFloat(marginBottom) - sidebarTop)}px`;
    if (sidebar.style.maxHeight !== maxHeight) {
      sidebar.style.maxHeight = maxHeight;
    }
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(main);
  resizeObserver.observe(document.body);
  return () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    resizeObserver.disconnect();
    sidebar.style.maxHeight = '';
  };
}
