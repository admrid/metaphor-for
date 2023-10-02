const axios = require("axios");

module.exports = async (req, res) => {
  const { query } = req.query;

  if (!query) return res.status(400).send("A search query is required.");

  try {
    // 1. Metaphor Client
    const metaphorClient = axios.create({
      baseURL: "https://api.metaphor.systems",
      headers: {
        "x-api-key": process.env.METAPHOR_API_KEY,
      },
    });

    const metaphorResults = await metaphorClient.post("/search", { query });

    // 2. SerpAPI Client
    const serpApiClient = axios.create({
      baseURL: "https://serpapi.com",
    });

    const serpApiResults = await serpApiClient.get("/search", {
      params: {
        q: query,
        // q: "Coffee",
        engine: "google",
        api_key: process.env.SERP_API_KEY,
      },
    });

    // 3. Fetching Favicons for Metaphor Results
    const resultsWithFavicons = await Promise.all(
      metaphorResults.data.results.map(async (result) => {
        try {
          const faviconURL = `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}`;
          const response = await axios.get(faviconURL, { responseType: "arraybuffer" });
          result.favicon = `data:image/png;base64,${Buffer.from(response.data, "binary").toString("base64")}`;
        } catch (error) {
          result.favicon = "";
        }
        return result;
      })
    );

    // Setup CORS headers
    // res.setHeader("Access-Control-Allow-Origin", "*"); // allow any origin to access
    // res.setHeader("Access-Control-Allow-Methods", "GET"); // only allow GET

    // console.log("serpApiResults.data.organic_results: ", serpApiResults.data.organic_results);
    // console.log("resultsWithFavicons: ", resultsWithFavicons);

    // 4. Structure the response to include results from both APIs
    res.status(200).json({
      metaphorResults: resultsWithFavicons,
      serpApiResults: serpApiResults.data.organic_results,
    });
  } catch (error) {
    console.error(error);

    // Setup CORS headers in case of an error too
    // res.setHeader("Access-Control-Allow-Origin", "*");
    // res.setHeader("Access-Control-Allow-Methods", "GET");

    res.status(500).send("Internal Server Error");
  }
};
