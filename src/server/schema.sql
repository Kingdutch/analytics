CREATE TABLE pageviews (
  `id` INT(8) PRIMARY KEY AUTO_INCREMENT,
  `type` VARCHAR(255) NOT NULL,
  `hostname` VARCHAR(255) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `user_agent` VARCHAR(255) NOT NULL,
  `timezone` VARCHAR(255),
  `visited` BIGINT NOT NULL,
  `submitted` BIGINT NOT NULL,
  `time_on_page` BIGINT,
  `width` INT,
  `height` INT,
  `scroll` INT(4),
  `source_source` VARCHAR(255),
  `source_medium` VARCHAR(255),
  `source_campaign` VARCHAR(255),
  `source_referrer` VARCHAR(255)
);

