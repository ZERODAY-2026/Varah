-- ============================================================================
-- DataMind Snowflake Setup Script (Reproducible & Idempotent)
-- Track: PS1 (ZeroDay OSS Hacktoberfest) & MLH Best Open-Source AI Project
-- ============================================================================

-- 1. Compute Warehouse Configuration
-- X-Small warehouse + 60s auto-suspend prevents runaway compute & trial credit drain
CREATE WAREHOUSE IF NOT EXISTS DATAMIND_WH
  WITH WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE
  COMMENT = 'DataMind agent warehouse - XSmall with 60s auto-suspend for credit conservation';

USE WAREHOUSE DATAMIND_WH;

-- 2. Database and Schema Initialization
CREATE DATABASE IF NOT EXISTS DATAMIND_DB;
USE DATABASE DATAMIND_DB;
CREATE SCHEMA IF NOT EXISTS PUBLIC;
USE SCHEMA DATAMIND_DB.PUBLIC;

-- 3. Dimension Table: COUNTRIES
CREATE OR REPLACE TABLE COUNTRIES (
    COUNTRY_ID INT PRIMARY KEY,
    COUNTRY_NAME VARCHAR(100) NOT NULL,
    ISO_CODE VARCHAR(3) NOT NULL,
    REGION VARCHAR(50) NOT NULL,
    INCOME_GROUP VARCHAR(50) NOT NULL
)
COMMENT = 'Country metadata dimension table for analytical multi-table JOINs';

-- 4. Fact Table: COUNTRY_INDICATORS (Foreign key relationship with COUNTRIES)
CREATE OR REPLACE TABLE COUNTRY_INDICATORS (
    INDICATOR_ID INT PRIMARY KEY,
    COUNTRY_ID INT NOT NULL REFERENCES COUNTRIES(COUNTRY_ID),
    YEAR INT NOT NULL,
    LIFE_EXPECTANCY FLOAT,
    GDP_PER_CAPITA FLOAT,
    POPULATION BIGINT,
    CO2_PER_CAPITA FLOAT
)
COMMENT = 'Historical country-year indicators derived from Our World in Data (OWID)';

-- 5. Seed Dimension Data (COUNTRIES)
INSERT INTO COUNTRIES (COUNTRY_ID, COUNTRY_NAME, ISO_CODE, REGION, INCOME_GROUP) VALUES
(1, 'India', 'IND', 'South Asia', 'Lower middle income'),
(2, 'United States', 'USA', 'North America', 'High income'),
(3, 'China', 'CHN', 'East Asia & Pacific', 'Upper middle income'),
(4, 'Germany', 'DEU', 'Europe & Central Asia', 'High income'),
(5, 'Japan', 'JPN', 'East Asia & Pacific', 'High income'),
(6, 'Brazil', 'BRA', 'Latin America & Caribbean', 'Upper middle income'),
(7, 'Nigeria', 'NGA', 'Sub-Saharan Africa', 'Lower middle income'),
(8, 'United Kingdom', 'GBR', 'Europe & Central Asia', 'High income');

-- 6. Seed Fact Data (COUNTRY_INDICATORS: 1990 - 2021 time-series)
INSERT INTO COUNTRY_INDICATORS (INDICATOR_ID, COUNTRY_ID, YEAR, LIFE_EXPECTANCY, GDP_PER_CAPITA, POPULATION, CO2_PER_CAPITA) VALUES
-- India
(101, 1, 1990, 58.7, 1800.0, 873277749, 0.71),
(102, 1, 2000, 62.6, 2600.0, 1056575549, 0.98),
(103, 1, 2010, 66.7, 4400.0, 1234281170, 1.41),
(104, 1, 2019, 70.9, 6800.0, 1383112050, 1.82),
(105, 1, 2020, 70.15, 6400.0, 1396387127, 1.74),
(106, 1, 2021, 67.2, 7100.0, 1407563842, 1.90),

-- United States
(201, 2, 1990, 75.2, 37000.0, 248083732, 19.3),
(202, 2, 2000, 76.6, 46000.0, 282162411, 20.1),
(203, 2, 2010, 78.5, 49000.0, 309326085, 17.4),
(204, 2, 2019, 78.8, 62500.0, 328329953, 15.2),
(205, 2, 2020, 77.0, 60200.0, 331501080, 13.7),
(206, 2, 2021, 76.4, 64000.0, 332031554, 14.9),

-- China
(301, 3, 1990, 69.3, 1500.0, 1144449734, 2.15),
(302, 3, 2000, 71.9, 3700.0, 1264099069, 2.70),
(303, 3, 2010, 75.3, 9500.0, 1337705000, 6.56),
(304, 3, 2019, 77.4, 16100.0, 1407745000, 7.82),
(305, 3, 2020, 77.9, 16400.0, 1411100000, 7.91),
(306, 3, 2021, 78.2, 17500.0, 1412600000, 8.05),

-- Germany
(401, 4, 2010, 80.3, 44000.0, 81776930, 9.6),
(402, 4, 2018, 81.0, 52000.0, 82905782, 8.9),
(403, 4, 2019, 81.3, 53000.0, 83092962, 8.4),
(404, 4, 2020, 81.0, 50500.0, 83160871, 7.7),

-- Japan
(501, 5, 2010, 82.9, 39000.0, 128070000, 9.2),
(502, 5, 2018, 84.2, 41500.0, 126529100, 8.7),
(503, 5, 2019, 84.4, 42000.0, 126264931, 8.5),
(504, 5, 2020, 84.6, 40100.0, 125836021, 8.1);

-- 7. Read-Only Role Assignment for Maximum Security
CREATE ROLE IF NOT EXISTS DATAMIND_READER;
GRANT USAGE ON WAREHOUSE DATAMIND_WH TO ROLE DATAMIND_READER;
GRANT USAGE ON DATABASE DATAMIND_DB TO ROLE DATAMIND_READER;
GRANT USAGE ON SCHEMA DATAMIND_DB.PUBLIC TO ROLE DATAMIND_READER;
GRANT SELECT ON ALL TABLES IN SCHEMA DATAMIND_DB.PUBLIC TO ROLE DATAMIND_READER;
GRANT SELECT ON FUTURE TABLES IN SCHEMA DATAMIND_DB.PUBLIC TO ROLE DATAMIND_READER;

-- 8. Verify Table Creation and Counts
SELECT 'COUNTRIES' AS TABLE_NAME, COUNT(*) AS ROW_COUNT FROM COUNTRIES
UNION ALL
SELECT 'COUNTRY_INDICATORS' AS TABLE_NAME, COUNT(*) AS ROW_COUNT FROM COUNTRY_INDICATORS;

