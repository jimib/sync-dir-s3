# sync dir s3

[![NPM version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![Code style][standard-image]][standard-url]

> Sync whole directories to Amazon S3

### Installation

```
$ npm install -g sync-dir-s3
```

### Motivation

Whilst there are already a lot of S3 command line clients out there all I really wanted was something like `rsync`
that I can use for backing up files from my laptop and servers to S3.

This command line tool provides _some_ options but decides on a lot of things as well. The big assumption
is that for the most part it will be interacted with and is not 100% automated. It doesn't rely on credentials
being available globally (i.e. `~/.aws/` or similar) as it prompts you for these, and stores these in an encrypted
format in your home directory.

Another important aspect is that it just decides how to name your files in an S3 bucket. For speed and ease
you just specify the bucket and it will name everything like this:

```
{bucketName}/{hostName}/{directoryTree}/{filename}
```

So for example, if you were to run it in the following directory (assuming a bucket name of _my-backups_)...

```
$ hostname
lenovo-ideapad
$ cd /home/user/MyFiles/
$ ls
file1.txt   file2.txt   file3.png
file4.xls
$ sync-dir-s3 # interactions skipped in this example
```

...you'd get the following in the __`my-backups`__ bucket:

```
lenovo-ideapad/home/user/MyFiles/file1.txt
lenovo-ideapad/home/user/MyFiles/file2.txt
lenovo-ideapad/home/user/MyFiles/file3.png
lenovo-ideapad/home/user/MyFiles/file4.xls
```

This way (as long as your different machines have different hostnames)
you don't have to worry about name structures and everything is kept
predictable and consistent.

[npm-image]: https://img.shields.io/npm/v/sync-dir-s3.svg
[npm-url]: https://npmjs.org/package/sync-dir-s3
[license-image]: http://img.shields.io/npm/l/sync-dir-s3.svg
[license-url]: LICENSE
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: https://github.com/feross/standard
