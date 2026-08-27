/**
 * @jest-environment jsdom
 */
import { renderHeader } from "../renderHeader";

test("should render html", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [] },
      { title: "header 1", pos: 10, siblings: [] },
    ],
    onClick: () => {},
  });

  expect(h.outerHTML).toBe(
    `<div class="zoom-plugin-header"><a class="zoom-plugin-title" data-pos="null" href="#">Document</a><span class="zoom-plugin-delimiter">&gt;</span><a class="zoom-plugin-title" data-pos="10" href="#">header 1</a></div>`
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
          { title: "header 1", pos: 10 },
          { title: "header 2", pos: 20 },
        ],
      },
    ],
    onClick: () => {},
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
  });

  h.querySelectorAll<HTMLAnchorElement>(".zoom-plugin-title")[0].click();

  expect(onClick).toHaveBeenCalledWith(null, expect.any(MouseEvent), []);
});

test("should handle click on header link with siblings", () => {
  const onClick = jest.fn();
  const siblings = [
    { title: "header 1", pos: 10 },
    { title: "header 2", pos: 20 },
  ];
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [] },
      { title: "header 1", pos: 10, siblings },
    ],
    onClick,
  });

  h.querySelectorAll<HTMLAnchorElement>(".zoom-plugin-title")[1].click();

  expect(onClick).toHaveBeenCalledWith(10, expect.any(MouseEvent), siblings);
});
