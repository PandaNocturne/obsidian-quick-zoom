/**
 * @jest-environment jsdom
 */
import { renderHeader } from "../renderHeader";

const renderOptions = {
  renderMarkdown: false,
  itemMaxWidthPx: 300,
};

test("should render html", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [] },
      { title: "header 1", pos: 10, siblings: [] },
    ],
    onClick: () => {},
    renderOptions,
  });

  expect(h.outerHTML).toBe(
    `<div class="zoom-plugin-header"><a class="zoom-plugin-title" data-pos="null" href="#"><span class="zoom-plugin-title-text" style="max-width: 300px;">Document</span></a><span class="zoom-plugin-delimiter">&gt;</span><a class="zoom-plugin-title" data-pos="10" href="#"><span class="zoom-plugin-title-text" style="max-width: 300px;">header 1</span></a></div>`
  );
});

test("should render chevron when title has siblings", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [] },
      {
        title: "header 1",
        pos: 10,
        siblings: [
          { title: "header 1", pos: 10, kind: "heading" },
          { title: "header 2", pos: 20, kind: "heading" },
        ],
      },
    ],
    onClick: () => {},
    renderOptions,
  });

  const title = h.querySelectorAll(".zoom-plugin-title")[1];
  expect(title.classList.contains("zoom-plugin-title-has-siblings")).toBe(true);
  expect(title.querySelector(".zoom-plugin-title-chevron")).not.toBeNull();
});

test("should handle click on document link", () => {
  const onClick = jest.fn();
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [] },
      { title: "header 1", pos: 10, siblings: [] },
    ],
    onClick,
    renderOptions,
  });

  h.querySelectorAll<HTMLAnchorElement>(".zoom-plugin-title")[0].click();

  expect(onClick).toHaveBeenCalledWith(null, expect.any(MouseEvent), []);
});

test("should handle click on header link with siblings", () => {
  const onClick = jest.fn();
  const siblings = [
    { title: "header 1", pos: 10, kind: "heading" as const },
    { title: "header 2", pos: 20, kind: "heading" as const },
  ];
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [] },
      { title: "header 1", pos: 10, siblings },
    ],
    onClick,
    renderOptions,
  });

  h.querySelectorAll<HTMLAnchorElement>(".zoom-plugin-title")[1].click();

  expect(onClick).toHaveBeenCalledWith(10, expect.any(MouseEvent), siblings);
});
