# Contribution Guidelines
==================
## Overview
Being an Open Source project, everyone can contribute, provided that you respect the following points:
* Before contributing any code, the author must make sure all the tests work (see below how to launch the tests).
* Developed code must adhere to the syntax guidelines enforced by the linters.
* Code must be developed following the branching model and changelog policies defined below.
* For any new feature added, unit tests must be provided, following the example of the ones already created.

In order to start contributing:

1. Fork this repository clicking on the "Fork" button on the upper-right area of the page.

2. Clone your just forked repository:
<pre>
git clone https://github.com/your-github-username/iotagent-node-lib.git
</pre>
3. Add the main iotagent-node-lib repository as a remote to your forked repository (use any name for your remote
repository, it does not have to be iotagent-node-lib, although we will use it in the next steps):
<pre>
git remote add iotagent-node-lib https://github.com/telefonicaid/iotagent-node-lib.git
</pre>

Before starting your contribution, remember to synchronize the `master` branch in your forked repository with the `master`
branch in the main iotagent-node-lib repository, by following this steps

1. Change to your local `master` branch (in case you are not in it already):
<pre>
  git checkout master
</pre>
2. Fetch the remote changes:
<pre>
  git fetch iotagent-node-lib
</pre>
3. Merge them:
<pre>
  git rebase iotagent-node-lib/master
</pre>

Contributions following these guidelines will be added to the `master` branch, and released in the next version. The
release process is explaind in the *Releasing* section below.

## Branching model
There are one special branch in the repository:

* `master`: contains the last stable development code. New features and bug fixes are always merged to `master`.

In order to start developing a new feature or refactoring, a new branch should be created with one of the following names:

* `hardening/<taskName>`
* `task/<taskName>`
* `feature/<taskName>`

depending on the kind of work.

This branch must be created from the current version of the `master` branch. Once the new functionality has been
completed, a Pull Request will be created from the feature branch to `master`. Remember to check both the linters
and the tests before creating the Pull Request.

Bug fixes work the same way as other tasks, with the exception of the branch name, that should be called `bug/<bugName>`.

In order to contribute to the repository, these same scheme should be replicated in the forked repositories, so the
new features or fixes should all come from the current version of `master` and end up in `master` again.

All the `task/*` and `bug/*` branches are temporary, and should be removed once they have been merged.

There is another set of branches called `release/<versionNumber>`, one for each version of the product. This branches
point to each of the released versions of the project, they are permanent and they are created with each release.

## Changelog
The project contains a version changelog, called CHANGES_NEXT_RELEASE, that can be found in the root of the project.
Whenever a new feature or bug fix is going to be merged with `master`, a new entry should be added to this changelog.
The new entry should contain the reference number of the issue it is solving (if any).

When a new version is released, the changelog is frozen, and CHANGES_NEXT_RELEASE remains fixed in the last commit of
that version. The CHANGES_NEXT_RELEASE is flushed (i.e. all its content removed) when preparing for the next release
developing cycle (i.e. during the task described in bullet 6 in next subsection). The contents of this file are also
copied to the %changelog section in the .spec file for the component.

## Releasing
The process of making a release consists of the following steps:
1. Create a new task branch changing the development version number in the package.json (with a sufix `-next`), to the
new target version (without any sufix), and PR into `master`. Also, in this task, the contents of the Changelog are
copied to the RPM spec.
2. Create a tag from the last version of `master` named with the version number and push it to the repository.
3. Create the release in Github, from the created tag. In the description, add the contents of the Changelog.
4. Create a release branch from the last version of `master` named with the version number.
6. Create a new task for preparing the next release, adding the sufix `-next` to the current version number (to signal
this as the development version), and flush the contents of the CHANGES_NEXT_RELEASE file.

## Version numbers
The version number will change for each release, according to the following rules:

* All version numbers will always follow the common pattern: `X.Y.Z`
* *X* will change only when there are changes in the release breaking backwards compatibility, or when there are
very important changes in the feature set of the component. If X changes, Y is set to 0.
* *Y* will change every time a new version is released. If only Y changes, it means some new features or bug fixes
have been released, but the component is just an improved version of the current major release.
* *Z* will be reserved for bugfixes inside the releases.

Between releases, the version number in the master branch will be `X.Y.Z-next` (where `X.Y.Z` is the last stable
release), indicating that its a development version.

Concerning the branching model:
* The master branch will always have a development version, that will change in every release.
* The release *tag* will always have the X.Y.0 version number corresponding to the release.
* The release *branch* will contain the X.Y.Z version number correspoding to the last bugfix in this release.

## Bugfixing in releases
When a bug is found affecting a release, a branch will be created *from that release* to create the patch. As a part
of the patch, the release version must be increased in its last number (Z). The patch then will be merged (via PR)
to the release branch. If the same bug may affect the main master branch, the bugfixing branch should also be merged
to master (or a new branch should be created from master with the cherry-picked commits).

