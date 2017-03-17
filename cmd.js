#!/usr/bin/env node

const path = require('path')
const os = require('os')
const crypto = require('crypto')
const fs = require('fs')
const co = require('co')
const easyline = require('easyline')
const S3 = require('aws-sdk').S3
const promiseInfinite = require('promise-infinite')
const ProgressBar = require('progress')
const mime = require('mime')
const args = require('minimist')(process.argv.slice(2))

const algorithm = 'aes256'
const enc = 'binary'
const rc = path.join(os.homedir(), '.sync-dir-s3')
const sysString = `${os.hostname()} (${os.platform()} ${os.release()})`
const fmt = 'syncing [:bar] :current of :total'
const meta = {uploadedFrom: sysString}

let bucket = args.bucket
const publicRead = args.public
const quiet = args.quiet
const y = args.y

function decrypt (password, value) {
  const decipher = crypto.createDecipher(algorithm, password)
  return JSON.parse(decipher.update(value, enc, 'utf8') +
    decipher.final('utf8'))
}

function encrypt (password, object) {
  const cipher = crypto.createCipher(algorithm, password)
  return cipher.update(JSON.stringify(object), 'utf8', enc) +
    cipher.final(enc)
}

function saveCredentials (password, key, secret) {
  return new Promise((resolve, reject) => {
    fs.writeFile(rc, encrypt(password, {key, secret}), enc, err => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function loadCredentials (password) {
  return new Promise((resolve, reject) => {
    fs.readFile(rc, enc, (err, body) => {
      if (err) return reject(err)

      try {
        resolve(decrypt(password, body))
      } catch (_) {
        reject(new Error('Password was invalid.'))
      }
    })
  })
}

function stat (file) {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, stat) => {
      if (err) reject(err)
      else resolve(stat)
    })
  })
}

const dirFiles = co.wrap(function * (dir) {
  const files = yield new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) reject(err)
      else resolve(files)
    })
  })

  const output = []

  for (const file of files) {
    if ((yield stat(file)).isFile()) {
      output.push(file)
    }
  }

  return output
})

function checkCredentials () {
  return new Promise(resolve => fs.exists(rc, resolve))
}

function * main () {
  const credentialsExist = yield checkCredentials()

  let key
  let secret

  const dirPath = process.cwd()
  const files = yield dirFiles(dirPath)

  if (!files.length) {
    console.log('There are no files to sync.')
    return process.exit()
  }

  if (credentialsExist) {
    const password = args.password ||
      (yield easyline.question('Password:'))
    const credentials = yield loadCredentials(password)

    key = credentials.key
    secret = credentials.secret
  } else {
    console.log('\nCredentials could not be found.\n')
    key = yield easyline.question('AWS Access Key:')
    secret = yield easyline.question('AWS Secret Key:')

    if (yield easyline.yesNo('Save credentials in: ' + rc + '?')) {
      console.log('\nCredentials will be encrypted.\n')
      const password = yield easyline.question('Enter a password:')
      yield saveCredentials(password, key, secret)
    } else {
      process.exit()
    }
  }

  const client = new S3({
    apiVersion: '2006-03-01',
    sslEnabled: true,
    accessKeyId: key,
    secretAccessKey: secret,
    signatureVersion: 'v4'
  })

  if (!bucket) {
    bucket = yield easyline.question('Bucket:')
  }

  const bar = !quiet && new ProgressBar(fmt, {total: files.length})

  if (publicRead && !y) {
    if (!(yield easyline.yesNo('Are you sure you want these files ' +
      'to be public?'))) {
      return process.exit()
    }
  }

  if (y || (yield easyline.yesNo(`Sync ${files.length} file(s)?`))) {
    const ops = files.map(file => new Promise((resolve, reject) => {
      const pathAsKey = path.join(dirPath, file)

      client.putObject({
        Key: pathAsKey.slice(1),
        Bucket: bucket,
        ContentType: mime.lookup(file),
        Body: fs.createReadStream(file),
        Metadata: meta,
        ACL: publicRead ? 'public-read' : 'private'
      }, err => {
        if (err) return reject(err)
        if (!quiet) bar.tick()
        resolve()
      })
    }))

    yield promiseInfinite(ops)
  } else {
    process.exit()
  }
}

co(main)
  .then(process.exit)
  .catch(err => {
    console.error(err.message || err)
    process.exit(1)
  })
