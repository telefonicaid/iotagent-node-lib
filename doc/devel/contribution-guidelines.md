# Contribution Guidelines

## Ground rules & expectations

Before we get started, here are a few things we expect from you (and that you should expect from others):

-   Be kind and thoughtful in your conversations around this project. We all come from different backgrounds and
    projects, which means we likely have different perspectives on "how open source is done." Try to listen to others
    rather than convince them that your way is correct.
-   Please ensure that your contribution passes all tests. If there are test failures, you will need to address them
    before we can merge your contribution.
-   When adding content, please consider if it is widely valuable. Please don't add references or links to things you or
    your employer have created as others will do so if they appreciate it.
-   When reporting a vulnerability on the software, please, put in contact with IoT Agent Node Lib repository
    maintainers in order to discuss it in a private way.

## How to contribute

If you'd like to contribute, start by searching through the
[issues](https://github.com/telefonicaid/iotagent-node-lib/issues) and
[pull requests](https://github.com/telefonicaid/iotagent-node-lib/pulls) to see whether someone else has raised a
similar idea or question.

If you don't see your idea listed, and you think it fits into the goals of this guide, do one of the following:

-   **If your contribution is minor,** such as a typo fix, open a pull request.
-   **If your contribution is major,** such as a new guide, start by opening an issue first. That way, other people can
    weigh in on the discussion before you do any work.

### Pull Request protocol

As explained in ([FIWARE Contribution Requirements](https://fiware-requirements.readthedocs.io/en/latest)) contributions
are done using a pull request (PR). The detailed "protocol" used in such PR is described below:

-   Direct commits to master branch (even single-line modifications) are not allowed. Every modification has to come as
    a PR
-   In case the PR is implementing/fixing a numbered issue, the issue number has to be referenced in the body of the PR
    at creation time
-   Anybody is welcome to provide comments to the PR (either direct comments or using the review feature offered by
    GitHub)
-   Use _code line comments_ instead of _general comments_, for traceability reasons (see comments lifecycle below)
-   Comments lifecycle
    -   Comment is created, initiating a _comment thread_
    -   New comments can be added as responses to the original one, starting a discussion
    -   After discussion, the comment thread ends in one of the following ways:
        -   `Fixed in <commit hash>` in case the discussion involves a fix in the PR branch (which commit hash is
            included as reference)
        -   `NTC`, if finally nothing needs to be done (NTC = Nothing To Change)
-   PR can be merged when the following conditions are met:
    -   All comment threads are closed
    -   All the participants in the discussion have provided a `LGTM` general comment (LGTM = Looks good to me)
-   Self-merging is not allowed (except in rare and justified circumstances)

Some additional remarks to take into account when contributing with new PRs:

-   PR must include not only code contributions, but their corresponding pieces of documentation (new or modifications
    to existing one) and tests
-   PR modifications must pass full regression based on existing test (unit, functional, memory, e2e) in addition to
    whichever new test added due to the new functionality
-   PR should be of an appropriated size that makes review achievable. Too large PRs could be closed with a "please,
    redo the work in smaller pieces" without any further discussing

## Community

Discussions about the Open Source Guides take place on this repository's
[Issues](https://github.com/telefonicaid/iotagent-node-lib/issues) and
[Pull Requests](https://github.com/telefonicaid/iotagent-node-lib/pulls) sections. Anybody is welcome to join these
conversations.

Wherever possible, do not take these conversations to private channels, including contacting the maintainers directly.

## Overview

Being an Open Source project, everyone can contribute, provided that you respect the following points:

-   Before contributing any code, the author must make sure all the tests work (see below how to launch the tests).
-   Developed code must adhere to the syntax guidelines enforced by the linters.
-   Code must be developed following the branching model and change log policies defined below.
-   For any new feature added, unit tests must be provided, following the example of the ones already created.

In order to start contributing:

1. Fork this repository clicking on the "Fork" button on the upper-right area of the page.

2. Clone your just forked repository:

```bash
git clone https://github.com/your-github-username/iotagent-node-lib.git
```

3. Add the main iotagent-node-lib repository as a remote to your forked repository (use any name for your remote
   repository, it does not have to be iotagent-node-lib, although we will use it in the next steps):

```bash
git remote add iotagent-node-lib https://github.com/telefonicaid/iotagent-node-lib.git
```

Before starting your contribution, remember to synchronize the `master` branch in your forked repository with the
`master` branch in the main iotagent-node-lib repository, by following this steps

1. Change to your local `master` branch (in case you are not in it already):

```bash
git checkout master
```

2. Fetch the remote changes:

```bash
git fetch iotagent-node-lib
```

3. Merge them:

```bash
git rebase iotagent-node-lib/master
```

Contributions following these guidelines will be added to the `master` branch, and released in the next version. The
release process is explaind in the _Releasing_ section below.

## Branching model

There are one special branch in the repository:

-   `master`: contains the last stable development code. New features and bugfixes are always merged to `master`.

In order to start developing a new feature or refactoring, a new branch should be created with one of the following
names:

-   `hardening/<taskName>`
-   `task/<taskName>`
-   `feature/<taskName>`

depending on the kind of work.

This branch must be created from the current version of the `master` branch. Once the new functionality has been
completed, a Pull Request will be created from the feature branch to `master`. Remember to check both the linters and
the tests before creating the Pull Request.

Bugfixes work the same way as other tasks, with the exception of the branch name, that should be called `bug/<bugName>`.

In order to contribute to the repository, these same scheme should be replicated in the forked repositories, so the new
features or fixes should all come from the current version of `master` and end up in `master` again.

All the `task/*` and `bug/*` branches are temporary, and should be removed once they have been merged.

There is another set of branches called `release/<versionNumber>`, one for each version of the product. This branches
point to each of the released versions of the project, they are permanent and they are created with each release.

## Change log

The project contains a version change log, called CHANGES_NEXT_RELEASE, that can be found in the root of the project.
Whenever a new feature or bug fix is going to be merged with `master`, a new entry should be added to this changelog.
The new entry should contain the reference number of the issue it is solving (if any).

When a new version is released, the change log is frozen, and CHANGES_NEXT_RELEASE remains fixed in the last commit of
that version. The CHANGES_NEXT_RELEASE is flushed (i.e. all its content removed) when preparing for the next release
developing cycle (i.e. during the task described in bullet 6 in next subsection). The contents of this file are also
copied to the change log section in the `.spec` file for the component.

## Releasing

The process of making a release consists of the following steps:

1. Create a new task branch changing the development version number in the package.json (with a sufix `-next`), to the
   new target version (without any sufix), and PR into `master`. Also, in this task, the contents of the Change log are
   copied to the RPM spec.
2. Create a tag from the last version of `master` named with the version number and push it to the repository.
3. Create the release in GitHub, from the created tag. In the description, add the contents of the Change log.
4. Create a release branch from the last version of `master` named with the version number.
5. Create a new task for preparing the next release, adding the sufix `-next` to the current version number (to signal
   this as the development version), and flush the contents of the CHANGES_NEXT_RELEASE file.
6. Upload the new library version to the npm repository using `npm publish` command from the release branch.

## Version numbers

The version number will change for each release, according to the following rules:

-   All version numbers will always follow the common pattern: `X.Y.Z`
-   _X_ will change only when there are changes in the release breaking backwards compatibility, or when there are very
    important changes in the feature set of the component. If X changes, Y is set to 0.
-   _Y_ will change every time a new version is released. If only Y changes, it means some new features or bugfixes have
    been released, but the component is just an improved version of the current major release.
-   _Z_ will be reserved for bugfixes inside the releases.

Between releases, the version number in the master branch will be `X.Y.Z-next` (where `X.Y.Z` is the last stable
release), indicating that its a development version.

Concerning the branching model:

-   The master branch will always have a development version, that will change in every release.
-   The release _tag_ will always have the X.Y.0 version number corresponding to the release.
-   The release _branch_ will contain the X.Y.Z version number correspoding to the last bugfix in this release.

## Bugfixing in releases

When a bug is found affecting a release, a branch will be created _from that release_ to create the patch. As a part of
the patch, the release version must be increased in its last number (Z). The patch then will be merged (via PR) to the
release branch. If the same bug may affect the main master branch, the bugfixing branch should also be merged to master
(or a new branch should be created from master with the cherry-picked commits).
