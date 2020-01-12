import fastq from 'fastq';
import mariadb from "mariadb";

const {
  DB_HOST,
  DB_NAME,
  DB_USER,
  DB_PASS,
} = process.env;

const dbPool = mariadb.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

/**
 * Normlises the pageviews and stores them to the database.
 *
 * @param data
 */
function storePageviews(data, cb) {
  let pageviews = [];

  data.pageviews.forEach((pageview, i) => {
    // Always use the initial source to attribute all requests.
    let source = data.source;
    // For pageviews after the first we set the referrer to be the previous
    // pageview. This allows navigations through a site to be analysed.
    if (i > 0) {
      source.referrer = data.hostname + data.pageviews[i-1].path
    }

    pageviews.push({
      type: data.type,
      hostname: data.hostname,
      path: pageview.path,
      user_agent: data.agent,
      timezone: data.timezone,
      visited: pageview.time,
      submitted: data.time,
      time_on_page: pageview.timeOnPage,
      width: data.width,
      height: data.height,
      scroll: pageview.scroll !== null ? pageview.scroll * 100 : null,
      source_source: source.source,
      source_medium: source.medium,
      source_campaign: source.campaign,
      source_referrer: source.referrer,
    });
  });

  console.log("Storing pageviews");
  console.log(pageviews);

  dbPool.getConnection()
    .then(conn =>
      conn.batch(
        {
          namedPlaceholders: true,
          sql: "INSERT INTO pageviews VALUES (NULL, :type, :hostname, :path, :user_agent, :timezone, :visited, :submitted, :time_on_page, :width, :height, :scroll, :source_source, :source_medium, :source_campaign, :source_referrer)",
        },
        pageviews
      )
        .then(() => conn.release())
    )
    .then(() => cb());
}

const queue = fastq(storePageviews,1);

const store = queue.push.bind(queue);
export default store;
