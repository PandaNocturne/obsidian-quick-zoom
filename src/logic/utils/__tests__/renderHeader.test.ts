/**
 * @jest-environment jsdom
 */
import { renderHeader } from "../renderHeader";

jest.mock("obsidian", () => ({
  setIcon: (el: HTMLElement, icon: string) => {
    el.setAttribute("data-icon", icon);
  },
}));

const renderOptions = {
  renderMarkdown: false,
  itemMaxWidthPx: 300,
};

test("should render html with icons", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [], kind: "document" },
      {
        title: "header 1",
        pos: 10,
        siblings: [],
        kind: "heading",
        headingLevel: 1,
      },
    ],
    onClick: () => {},
    renderOptions,
  });

  const titles = h.querySelectorAll(".zoom-plugin-title");
  expect(titles[0].classList.contains("zoom-plugin-title--document")).toBe(
    true
  );
  expect(titles[0].querySelector(".zoom-plugin-title-text")).toBeNull();
  expect(
    titles[0]
      .querySelector(".zoom-plugin-title-icon")
      ?.getAttribute("data-icon")
  ).toBe("file-text");

  expect(titles[1].querySelector(".zoom-plugin-title-text")?.textContent).toBe(
    "header 1"
  );
  expect(
    titles[1]
      .querySelector(".zoom-plugin-title-icon")
      ?.getAttribute("data-icon")
  ).toBe("heading-1");
});

test("should mark title when it has siblings", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [], kind: "document" },
      {
        title: "header 1",
        pos: 10,
        siblings: [
          { title: "header 1", pos: 10, kind: "heading" },
          { title: "header 2", pos: 20, kind: "heading" },
        ],
        kind: "heading",
        headingLevel: 1,
      },
    ],
    onClick: () => {},
    renderOptions,
  });

  const title = h.querySelectorAll(".zoom-plugin-title")[1];
  expect(title.classList.contains("zoom-plugin-title-has-siblings")).toBe(true);
  expect(title.querySelector(".zoom-plugin-title-chevron")).toBeNull();
});

test("should handle click on document link", () => {
  const onClick = jest.fn();
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [], kind: "document" },
      {
        title: "header 1",
        pos: 10,
        siblings: [],
        kind: "heading",
        headingLevel: 1,
      },
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
      { title: "Document", pos: null, siblings: [], kind: "document" },
      {
        title: "header 1",
        pos: 10,
        siblings,
        kind: "heading",
        headingLevel: 1,
      },
    ],
    onClick,
    renderOptions,
  });

  h.querySelectorAll<HTMLAnchorElement>(".zoom-plugin-title")[1].click();

  expect(onClick).toHaveBeenCalledWith(10, expect.any(MouseEvent), siblings);
});

test("should use list icon for list breadcrumbs", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null, siblings: [], kind: "document" },
      {
        title: "item",
        pos: 10,
        siblings: [],
        kind: "list",
        listType: "unordered",
      },
    ],
    onClick: () => {},
    renderOptions,
  });

  expect(
    h
      .querySelectorAll(".zoom-plugin-title")[1]
      .querySelector(".zoom-plugin-title-icon")
      ?.getAttribute("data-icon")
  ).toBe("list");
});
