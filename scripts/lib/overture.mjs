// Reads single places from the Overture Maps release by id (used to enrich places imported earlier).
import { DuckDBInstance } from '@duckdb/node-api';

export async function latestRelease() {
  let res;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      res = await fetch('https://overturemaps-us-west-2.s3.amazonaws.com/?prefix=release/&delimiter=/', { signal: AbortSignal.timeout(20000) });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  const releases = [...(await res.text()).matchAll(/<Prefix>release\/([^<]+)\/<\/Prefix>/g)].map((m) => m[1]).sort();
  return releases.at(-1);
}

const list = (v) => (Array.isArray(v) ? v : v?.items ?? []);

/** Map id -> { name, taxonomy, lat, lng, city, address, phones, websites, socials }. */
export async function fetchOvertureByIds(ids) {
  if (ids.length === 0) return new Map();
  const release = await latestRelease();
  const db = await DuckDBInstance.create(':memory:');
  const conn = await db.connect();
  await conn.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
  const quoted = ids.map((i) => `'${String(i).replace(/[^0-9a-f-]/gi, '')}'`).join(',');
  const result = await conn.runAndReadAll(`
    select id, names.primary as pname, taxonomy.primary as taxonomy, phones, websites, socials,
           addresses[1].freeform as address, addresses[1].locality as city,
           (bbox.ymin + bbox.ymax) / 2 as lat, (bbox.xmin + bbox.xmax) / 2 as lng
    from read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)
    where bbox.xmin between 34.2 and 35.95 and bbox.ymin between 29.4 and 33.4 and id in (${quoted})`);
  return new Map(
    result.getRowObjects().map((r) => [
      r.id,
      {
        name: r.pname,
        taxonomy: r.taxonomy,
        lat: Number(r.lat),
        lng: Number(r.lng),
        city: r.city,
        address: r.address,
        phones: list(r.phones),
        websites: list(r.websites),
        socials: list(r.socials),
      },
    ])
  );
}
