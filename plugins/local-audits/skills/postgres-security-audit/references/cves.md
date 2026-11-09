# PostgreSQL CVE table

Research date: 2026-11-09. Source: the PostgreSQL security page (https://www.postgresql.org/support/security/), the release announcements it links to, and NVD. Release dates are the announcement dates. "Affected" lists only the majors the PostgreSQL project supported on the research date (18, 17, 16, 15, 14). Majors 13 and older are end of life and get no further security fixes. "Patched" is the first fixed minor per major; install the latest minor. Check the security page for anything newer than the research date.

**Safe floor on the research date: 18.6, 17.11, 16.15, 15.19, 14.24** (August 13, 2026). Every earlier minor on these majors is affected by at least one row below. A server below the floor for its major is a finding.

Components, as the PostgreSQL project labels them: **core server** is the database server; **client** is libpq, psql, pg_dump and other client tools; **contrib module** is an extension shipped with PostgreSQL, which matters only when the extension is installed (`SELECT extname FROM pg_extension`).

## Rows that matter most for app audits

These change what an app role can read, write or run. Check them first.

- Row-level security: CVE-2024-10976, CVE-2026-14666, CVE-2025-8713
- Role switching: CVE-2024-10978
- SQL quoting in client libraries: CVE-2025-1094
- SQL injection inside server features: CVE-2026-15741, CVE-2026-6638, CVE-2026-6637
- Missing privilege checks: CVE-2025-12817, CVE-2026-6472, CVE-2026-6470
- Password checks: CVE-2026-6478 (MD5 passwords), CVE-2026-14672 (non-default `scram_iterations`)
- `search_path`: CVE-2026-14673

## All rows, newest first

| CVE | Component | CVSS v3 | What it is | Affected majors | Patched | Released | NVD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CVE-2026-19385 | client | 8.8 | PostgreSQL pg_dump heap buffer overflow executes arbitrary code | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-19385 |
| CVE-2026-18408 | client | 8.8 | PostgreSQL psql \unrestrict lets superuser of pg_dump origin server execute arbitrary code in psql client | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-18408 |
| CVE-2026-18024 | core server | 4.3 | PostgreSQL ascii() function reads past end of buffer | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-18024 |
| CVE-2026-16241 | client | 3.8 | PostgreSQL ECPG integer underflow can crash the client | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-16241 |
| CVE-2026-16239 | core server | 8.8 | PostgreSQL type confusion in cursor CLOSE + DECLARE executes arbitrary code | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-16239 |
| CVE-2026-16238 | core server | 8.8 | PostgreSQL type confusion in pg_restore_attribute_stats() executes arbitrary code | 18 | 18.6 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-16238 |
| CVE-2026-15742 | contrib module | 8.8 | PostgreSQL fuzzystrmatch writes effectively-arbitrary addresses, via integer wraparound | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-15742 |
| CVE-2026-15741 | core server | 8.8 | PostgreSQL expression deparse allows SQL injection via EXTRACT argument | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-15741 |
| CVE-2026-14681 | core server | 4.2 | PostgreSQL improper enforcement of GSSAPI encryption when coupled with SSL | 18, 17 | 18.6, 17.11 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14681 |
| CVE-2026-14680 | core server | 8.8 | PostgreSQL type confusion via "internal" arguments | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14680 |
| CVE-2026-14679 | core server | 8.2 | PostgreSQL stack buffer overflow in argument match writes 0x0 and 0x1 to server memory | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14679 |
| CVE-2026-14678 | contrib module | 4.3 | PostgreSQL pg_trgm picksplit reads past end of buffer | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14678 |
| CVE-2026-14677 | core server | 8.8 | PostgreSQL 32-bit pltcl and plperl undersize allocations, via integer wraparound | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14677 |
| CVE-2026-14676 | contrib module | 8.8 | PostgreSQL pg_stat_statements heap buffer overflow executes arbitrary code | 18 | 18.6 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14676 |
| CVE-2026-14673 | contrib module | 3.8 | PostgreSQL amcheck does not clear untrusted search path | 18, 16, 15, 14 | 18.6, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14673 |
| CVE-2026-14672 | core server | 5.3 | PostgreSQL observable response discrepancy with non-default scram_iterations provides user existence oracle | 18, 17, 16 | 18.6, 17.11, 16.15 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14672 |
| CVE-2026-14671 | contrib module | 8.8 | PostgreSQL refint plan cache type confusion executes arbitrary code | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14671 |
| CVE-2026-14670 | core server | 8.8 | PostgreSQL plperl tied object heap buffer overflow executes arbitrary code | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14670 |
| CVE-2026-14669 | core server | 8.8 | PostgreSQL to_char heap buffer overflow executes arbitrary code | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14669 |
| CVE-2026-14668 | core server | 8.1 | PostgreSQL ctid type confusion in selectivity estimator discloses derivative of arbitrary read | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14668 |
| CVE-2026-14666 | core server | 4.2 | PostgreSQL row security caching disregards role modifications | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14666 |
| CVE-2026-14664 | core server | 8.8 | PostgreSQL regexp heap buffer overflow executes arbitrary code | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14664 |
| CVE-2026-14663 | contrib module | 6.5 | PostgreSQL pgcrypto, for OpenSSL-disabled ciphers, silently encrypts to and decrypts from cleartext | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14663 |
| CVE-2026-14662 | core server | 8.8 | PostgreSQL tsvector and tsquery undersize allocations, via integer wraparound | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-14662 |
| CVE-2026-6638 | core server | 3.7 | PostgreSQL REFRESH PUBLICATION allows SQL injection via table name | 18, 17, 16 | 18.4, 17.10, 16.14 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6638 |
| CVE-2026-6637 | contrib module | 8.8 | PostgreSQL refint allows stack buffer overflow and SQL injection | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6637 |
| CVE-2026-6575 | core server | 4.3 | PostgreSQL pg_restore_attribute_stats accepts values that cause query planning to read past end of stats array | 18 | 18.4 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6575 |
| CVE-2026-6479 | core server | 7.5 | PostgreSQL SSL/GSS init causes denial of service, via uncontrolled recursion | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6479 |
| CVE-2026-6478 | core server | 6.5 | PostgreSQL discloses MD5-hashed passwords via covert timing channel | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6478 |
| CVE-2026-6477 | client | 8.8 | PostgreSQL libpq lo_* functions let server superuser overwrite client stack memory | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6477 |
| CVE-2026-6476 | client | 7.2 | PostgreSQL pg_createsubscriber allows SQL injection via subscription name | 18, 17 | 18.4, 17.10 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6476 |
| CVE-2026-6475 | client | 8.8 | PostgreSQL pg_basebackup and pg_rewind can overwrite unrelated files of origin superuser choice | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6475 |
| CVE-2026-6474 | core server | 4.3 | PostgreSQL timeofday() can disclose portions of server memory | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6474 |
| CVE-2026-6473 | core server | 8.8 | PostgreSQL server undersizes allocations, via integer wraparound | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6473 |
| CVE-2026-6472 | core server | 5.4 | PostgreSQL CREATE TYPE does not check multirange schema CREATE privilege | 18, 17, 16, 15, 14 | 18.4, 17.10, 16.14, 15.18, 14.23 | 2026-05-14 | https://nvd.nist.gov/vuln/detail/CVE-2026-6472 |
| CVE-2026-6471 | core server | 7.2 | PostgreSQL logical decoding can dlopen arbitrary file | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-6471 |
| CVE-2026-6470 | core server | 4.3 | PostgreSQL fails to check type USAGE privilege | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-6470 |
| CVE-2026-6469 | core server | 3.8 | PostgreSQL ALTER TABLE ALTER TYPE resets extended statistics ownership | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-6469 |
| CVE-2026-6464 | client | 8.1 | PostgreSQL psql COPY FROM STDIN early failure processes data lines as psql commands | 18, 17, 16, 15, 14 | 18.6, 17.11, 16.15, 15.19, 14.24 | 2026-08-13 | https://nvd.nist.gov/vuln/detail/CVE-2026-6464 |
| CVE-2026-2007 | contrib module | 8.2 | PostgreSQL pg_trgm heap buffer overflow writes pattern onto server memory | 18 | 18.2 | 2026-02-12 | https://nvd.nist.gov/vuln/detail/CVE-2026-2007 |
| CVE-2026-2006 | core server | 8.8 | PostgreSQL missing validation of multibyte character length executes arbitrary code | 18, 17, 16, 15, 14 | 18.2, 17.8, 16.12, 15.16, 14.21 | 2026-02-12 | https://nvd.nist.gov/vuln/detail/CVE-2026-2006 |
| CVE-2026-2005 | contrib module | 8.8 | PostgreSQL pgcrypto heap buffer overflow executes arbitrary code | 18, 17, 16, 15, 14 | 18.2, 17.8, 16.12, 15.16, 14.21 | 2026-02-12 | https://nvd.nist.gov/vuln/detail/CVE-2026-2005 |
| CVE-2026-2004 | contrib module | 8.8 | PostgreSQL intarray missing validation of type of input to selectivity estimator executes arbitrary code | 18, 17, 16, 15, 14 | 18.2, 17.8, 16.12, 15.16, 14.21 | 2026-02-12 | https://nvd.nist.gov/vuln/detail/CVE-2026-2004 |
| CVE-2026-2003 | core server | 4.3 | PostgreSQL oidvector discloses a few bytes of memory | 18, 17, 16, 15, 14 | 18.2, 17.8, 16.12, 15.16, 14.21 | 2026-02-12 | https://nvd.nist.gov/vuln/detail/CVE-2026-2003 |
| CVE-2025-12818 | core server | 5.9 | PostgreSQL libpq undersizes allocations, via integer wraparound | 18, 17, 16, 15, 14 | 18.1, 17.7, 16.11, 15.15, 14.20 | 2025-11-13 | https://nvd.nist.gov/vuln/detail/CVE-2025-12818 |
| CVE-2025-12817 | core server | 3.1 | PostgreSQL CREATE STATISTICS does not check for schema CREATE privilege | 18, 17, 16, 15, 14 | 18.1, 17.7, 16.11, 15.15, 14.20 | 2025-11-13 | https://nvd.nist.gov/vuln/detail/CVE-2025-12817 |
| CVE-2025-8715 | core server | 8.8 | PostgreSQL pg_dump newline in object name executes arbitrary code in psql client and in restore target server | 17, 16, 15, 14 | 17.6, 16.10, 15.14, 14.19 | 2025-08-14 | https://nvd.nist.gov/vuln/detail/CVE-2025-8715 |
| CVE-2025-8714 | core server | 8.8 | PostgreSQL pg_dump lets superuser of origin server execute arbitrary code in psql client | 17, 16, 15, 14 | 17.6, 16.10, 15.14, 14.19 | 2025-08-14 | https://nvd.nist.gov/vuln/detail/CVE-2025-8714 |
| CVE-2025-8713 | core server | 3.1 | PostgreSQL optimizer statistics can expose sampled data within a view, partition, or child table | 17, 16, 15, 14 | 17.6, 16.10, 15.14, 14.19 | 2025-08-14 | https://nvd.nist.gov/vuln/detail/CVE-2025-8713 |
| CVE-2025-4207 | core server | 5.9 | PostgreSQL GB18030 encoding validation can read one byte past end of allocation for text that fails validation | 17, 16, 15, 14 | 17.5, 16.9, 15.13, 14.18 | 2025-05-08 | https://nvd.nist.gov/vuln/detail/CVE-2025-4207 |
| CVE-2025-1094 | core server | 8.1 | PostgreSQL quoting APIs miss neutralizing quoting syntax in text that fails encoding validation | 17, 16, 15, 14 | 17.3, 16.7, 15.11, 14.16 | 2025-02-13 | https://nvd.nist.gov/vuln/detail/CVE-2025-1094 |
| CVE-2024-10979 | core server | 8.8 | PostgreSQL PL/Perl environment variable changes execute arbitrary code | 17, 16, 15, 14 | 17.1, 16.5, 15.9, 14.14 | 2024-11-14 | https://nvd.nist.gov/vuln/detail/CVE-2024-10979 |
| CVE-2024-10978 | core server | 4.2 | PostgreSQL SET ROLE, SET SESSION AUTHORIZATION reset to wrong user ID | 17, 16, 15, 14 | 17.1, 16.5, 15.9, 14.14 | 2024-11-14 | https://nvd.nist.gov/vuln/detail/CVE-2024-10978 |
| CVE-2024-10977 | client | 3.1 | PostgreSQL libpq retains an error message from man-in-the-middle | 17, 16, 15, 14 | 17.1, 16.5, 15.9, 14.14 | 2024-11-14 | https://nvd.nist.gov/vuln/detail/CVE-2024-10977 |
| CVE-2024-10976 | core server | 4.2 | PostgreSQL row security below e.g. subqueries disregards user ID changes | 17, 16, 15, 14 | 17.1, 16.5, 15.9, 14.14 | 2024-11-14 | https://nvd.nist.gov/vuln/detail/CVE-2024-10976 |
| CVE-2024-7348 | core server | 8.8 | PostgreSQL relation replacement during pg_dump executes arbitrary SQL | 16, 15, 14 | 16.4, 15.8, 14.13 | 2024-08-08 | https://nvd.nist.gov/vuln/detail/CVE-2024-7348 |
| CVE-2024-4317 | core server | 3.1 | Restrict visibility of "pg_stats_ext" and "pg_stats_ext_exprs" entries to the table owner | 16, 15, 14 | 16.3, 15.7, 14.12 | 2024-05-09 | https://nvd.nist.gov/vuln/detail/CVE-2024-4317 |
| CVE-2024-0985 | core server | 8.0 | PostgreSQL non-owner REFRESH MATERIALIZED VIEW CONCURRENTLY executes arbitrary SQL | 16, 15, 14 | 16.2, 15.6, 14.11 | 2024-02-08 | https://nvd.nist.gov/vuln/detail/CVE-2024-0985 |

## How to compare

1. Run `SHOW server_version;`. For example `17.9` is major 17, minor 9.
2. A row applies when the major is in "Affected majors" and the minor is older than the patched minor for that major.
3. For contrib rows, check that the extension is installed. For client rows, check the versions of `psql`, `pg_dump` and libpq where the app and its operators run them.
4. Report each row that applies with its NVD link, then whether the server is below the safe floor.
5. The fix is a minor upgrade. On a managed service, the provider sets the minor; point the user to its upgrade or maintenance settings.
