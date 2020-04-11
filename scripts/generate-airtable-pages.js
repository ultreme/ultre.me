const fs = require('fs'),
      path = require('path'),
      fetch = require('node-fetch'),
      mime = require('mime');

const AIRTABLE_BASE_ID = 'appgg0gNvXgqOnP9B';
const {
  AIRTABLE_API_KEY
} = process.env;

main();

async function main() {
  let entities;

  const pagesToCreate = ['Albums', 'Books', 'Artists', 'Events', 'Projects', 'Videos', 'Drawings', 'Photos', 'Ucpj', 'ChallengePJ'];
  const tableNames = [
    'Albums',
    'Books',
    'Artists',
    'Events',
    'Projects',
    'Tracks',
    'Mashups',
    'Playlists',
    'Videos',
    'Photos',
    'Texts',
    'Drawings',
    'Writings',
    'Tags',
    'Publishers',
    'Locations',
    'Ucpj',
    'ChallengePJ',
  ];

  try {
    const promises = tableNames.map(name => fetchTable(name));
    entities = (await Promise.all(promises)).map((items, index) => {
      const tableName = tableNames[index];
      if (pagesToCreate.includes(tableName)) {
        items = items
          .filter(isPublished)
          .map(addPageProps)
          .filter(i => i);
      }

      return items;
    }).reduce((a, b) => a.concat(b), []);
  } catch (error) {
    log(`ERROR ${error}`);
    process.exit(1);
  }

    const translated = splitToMultiLanguage(entities);

  try {
    await Promise.all([
      await downloadAttachmentsFromItems(entities)
    ]);
  } catch (err) {
    log(`ERROR: attachment download error: ${err}`);
    process.exit(5);
  }

  const defaultLanguage = 'en';
  ['en', 'fr'].forEach(lang => {
    // Join relations. 1 level deep
    const joined = joinRelations(translated[lang]);

    // Create normalized .Data.gen.airtable_LANG.json file with all entities
    generateDataFile(
      `airtable_${lang}.json`,
      normalizeArray(translated[lang])
    );

    // Create pages
    pagesToCreate.map(p => p.toLowerCase()).forEach(topic => {
      const langSuffix = (lang != defaultLanguage ? lang : '')
      generateMarkdownFiles(joined.filter(item => item.from_table === topic), langSuffix);
    });
  });
}

function addPageProps(item) {
  let title = '';
  let basedir = '';
  switch (item.from_table) {
    case 'albums':
      title = item.name;
      basedir = '/records/';
      break;
    case 'books':
      title = item.name;
      basedir = '/publishing/';
      break;
    case 'artists':
      title = item.name;
      basedir = '/artists/';
      break;
    case 'videos':
      title = item.name;
      basedir = '/videos/';
      break;
    case 'events':
      title = item.name;
      basedir = '/events/';
      break;
    case 'projects':
      title = item.name;
      basedir = '/projects/';
      break;
    case 'drawings':
      title = item.name;
      basedir = '/drawings/';
      break;
    case 'photos':
      title = item.name;
      basedir = '/photos/';
      break;
    case 'challengepj':
      title = item.name;
      basedir = '/challenges/';
      break;
    case 'ucpj':
      title = item.name;
      basedir = '/' + item.project_slug[0].split('-')[0] + "/";
      break;
    default:
      title = '';
      basedir = '';
  }

  if (title) {
    item.title = title;
  }
  else if (!title && !item['title_(en)'] && !item['title_(fr)']) {
    log(`WARNING ${item.from_table} ${item} doesn't have a title`);
    return null;
  }

  item.file_path = `${basedir}${item.slug}`;

  return item;
}

//
// Filters
//
function hasSlug(item) {
  if (item.slug) {
    return true;
  }

  log(`WARNING: ${item.from_table} ${item.title} doesn't have a slug`);
  return false;
}

function isPublished(item) {
  return item.published_on_ultre_me;
}


//
// Airtable
//
async function fetchTable(tableName) {
  let records = [];
  await _fetchTable();

  async function _fetchTable(offset) {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`;
        url = offset ? `${url}?offset=${offset}`: url;

    const headers = {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    };

    await fetch(url, { headers })
      .then(checkStatus)
      .then(res => {
        records = [ ...records, ...flattenAirtableRecords(tableName, res.records)];
        if (res.offset) {
          return _fetchTable(res.offset);
        }

        return records;
      })
      .catch(error => {
        log(`fetch table: AIRTABLE ERROR: ${error}`);
        process.exit(2);
      })

      async function checkStatus(res) {
      if (res.ok) {
        return res.json();
      } else {
        log(`check status: AIRTABLE ERROR: ${res.statusText} (${res.url})`);
        process.exit(3);
      }
    }
  }

  return records;
}

function flattenAirtableRecords(tableName, items) {
  return items.map(item => {
    let result = {};
    result.id = item.id;
    result.date = item.createdTime;
    result.from_table = tableName.toLowerCase();

    Object.keys(item.fields).forEach(key => {
      let value = item.fields[key];
      const newKey = key
        .toLowerCase()
        .replace(/\"/g, '')
        .replace(/\#/g, '_')
        .replace(/\./g, '_')
        .replace(/\(s\)/g, '_')
        .replace(/\s/g, '_');

      try {
        if (newKey == "json_(fr)") {
          result["parsed_json_(fr)"] = JSON.parse(value);
        }
        if (newKey == "json_(en)") {
          result["parsed_json_(en)"] = JSON.parse(value);
        }
      } catch (err) {
        log(`Parse JSON error: ${newKey}, ${value}`);
      }

      // if is file
      if (value instanceof Array) {
        value = value.map(item => {
          if (item && item.filename) {
            const url = item.thumbnails && item.thumbnails.large
              ? item.thumbnails.large.url
              : item.url;
            const extension = mime.getExtension(item.type);

            if (!extension) {
              log(`WARNING: file extension unknown for ${item.type}`);
            }

            return {
              isfile: true,
              filename: item.filename,
              size: item.size,
              type: item.type,
              remote: url,
              local: getAttachmentPath(`${item.id}-${item.filename.replace(/\s/g, '_')}.${extension}`, false)
            };
          }
          return item;
        })
      }

      result[newKey] = value;
    });

    return result;
  })
}

//
// Language
//
function splitToMultiLanguage(items) {
  let result = { en: [], fr: [] };

  items.forEach(item => {
    let translations = { en: {}, fr: {} };

    Object.keys(item).forEach(key => {
      const value = item[key];
      if (isTranslated(key)) {
        const lang = getLanguage(key);
        translations[lang][removeLanguageKey(key)] = value;
      } else {
        translations.en[key] = value;
        translations.fr[key] = value;
      }
    });

    result.en.push(translations.en);
    result.fr.push(translations.fr);
  });

  return result;
}

function isTranslated(key) {
  return key.lastIndexOf('(en)') > -1 || key.lastIndexOf('(fr)')  > -1;
}

function getLanguage(key) {
  return key.substring(
    key.lastIndexOf("(") + 1,
    key.lastIndexOf(")")
  );
}

function removeLanguageKey(key) {
  const lang = getLanguage(key);
  return key.replace(`_(${lang})`, '');
}


//
// Generate Data file
//
function generateDataFile(filepath, obj) {
  const fullpath = path.join(__dirname, '../data/gen', filepath);
  fs.mkdirSync(path.dirname(fullpath), { recursive: true });
  fs.writeFileSync(fullpath, JSON.stringify(obj, null, 2));
}


//
// Generate markdown files
//
function generateMarkdownFiles(items, langSuffix = '') {
  const _items = filterDuplicates(items.map(safeFrontmatterProps).filter(hasSlug));
  const suffix = langSuffix ? `.${langSuffix}.md` : '.md';
  _items.forEach(item => {
    const filepath = path.join(__dirname, '../content', item.file_path, `index${suffix}`);
    const dirpath = path.dirname(filepath);

    fs.mkdirSync(dirpath, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(item, null, 2));
    log(`Created file: ${filepath}`);
  });
}

function safeFrontmatterProps(item) {
  const prefix = 'at_';
  const reservedsKeys = ['type', 'url'];

  if (item.tags) {
    item.tags = item.tags.map(tag => tag.name);
  }

  Object.keys(item).forEach(key => {
    if (reservedsKeys.includes(key)) {
      item[`${prefix}${key}`] = item[key];
      delete item[key];
    }
  });
  return item;
}

function filterDuplicates(items) {
  const slugs = [];
  return items.filter(item => {
    if (slugs.includes(item)) {
      log(`WARNING: ${item.from_table} ${item.title} is duplicated`);
      return false;
    }
    slugs.push(item.slug)
    return true;
  });
}


//
// Relations
//
function joinRelations(items) {
  const normalized = normalizeArray(items)

  return items.map(item => {
    let result = {};

    Object.keys(item).forEach(key => {
      const value = item[key];
      let newValue = value;

      if (value instanceof Array) {
        newValue = value.map(v => {
          if (normalized[v]) {
            return normalized[v];
          }

          if (isId(v)) {
            log(`WARNING: ${item.from_table} ${item.title} referenced "${v}" as a relation, but is not found.`)
            return null;
          }

          return v;
        }).filter(i => i);
      }
      else if (normalized[value] && key != 'id') {
        newValue = normalized[value];
      }

      result[key] = newValue;
    });

    return result;
  })
}



//
// Download attachments
//
async function downloadAttachmentsFromItems(items) {
  const promises = [];

  items.forEach(item => {
    Object.keys(item).forEach(key => {
      const value = item[key];
      if (value instanceof Array) {
        value.forEach(async v => {
          if (v && v.isfile) {
            promises.push(downloadAttachment(v.remote, v.local));
          }
        })
      }
    })
  });

  try {
    await Promise.all(promises);
    return;
  } catch (err) {
    log(`Attachment download error: ${err}`);
    process.exit(4);
  }
}

async function downloadAttachment(url, destination) {
  const filepath = getAttachmentPath(destination);
  if (fs.existsSync(filepath)) {
    return;
  }
  log(`Downloading attachment ${url}`);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  const res = await fetch(url);
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filepath);
    res.body.pipe(fileStream);
    res.body.on("error", (err) => {
      reject(err);
    });
    fileStream.on("finish", function() {
      resolve();
    });
  });
}


//
// Other helpers
//
function normalizeArray(items, key = 'id') {
  let result = {};
  items.forEach(item => {
    if (!item[key]) {
      log(`WARNING item - ${item.id} - doesn't have the property ${key}`)
      return;
    }

    result[item[key]] = item;
   });
  return result;
}

function isId(value) {
  if (typeof value != 'string') return false;
  return value.startsWith('rec') && value.length == 17;
}

function getAttachmentPath(filepath, absolute = true) {
  const filename = path.basename(filepath);
  return absolute
    ? path.join(__dirname, `../assets/gen/${filename}`)
    : path.join(`/gen/${filename.replace(/\%/g, '_')}`);
}

function log(message) {
  console.log(message);
}
