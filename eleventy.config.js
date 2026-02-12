export default function (eleventyConfig) {
  // Ignore README from being processed as a template
  eleventyConfig.ignores.add("README.md");

  // Passthrough copy for static assets (src/assets → dist/assets)
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Custom filter for cache-busting
  eleventyConfig.addFilter("cacheBust", function () {
    return Date.now();
  });

  // Create a collection for all pages in the pages/ directory
  eleventyConfig.addCollection("pages", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/pages/**/*.md");
  });

  return {
    dir: {
      input: "src",
      includes: "includes",
      layouts: "includes/layouts",
      data: "data",
      output: "dist",
    },
    templateFormats: ["md", "liquid", "html"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}
