import { App, Component } from "obsidian";
import * as Obsidian from "obsidian";

export interface RenderOutlineTitleOptions {
  renderMarkdown: boolean;
  app?: App;
  sourcePath?: string;
  component?: Component;
}

type MarkdownRendererApi = {
  render(
    app: App,
    markdown: string,
    el: HTMLElement,
    sourcePath: string,
    component: Component
  ): Promise<void>;
};

function getMarkdownRenderer(): MarkdownRendererApi | null {
  return (
    (Obsidian as unknown as { MarkdownRenderer?: MarkdownRendererApi })
      .MarkdownRenderer ?? null
  );
}

export function renderOutlineTitle(
  container: HTMLElement,
  title: string,
  options: RenderOutlineTitleOptions
) {
  container.empty();

  const text = title || "(empty)";

  if (options.renderMarkdown && options.app && options.component) {
    const renderer = getMarkdownRenderer();
    if (renderer) {
      container.addClass("zoom-plugin-outline-title-md");
      void renderer.render(
        options.app,
        text,
        container,
        options.sourcePath ?? "",
        options.component
      );
      return;
    }
  }

  container.setText(text);
}
