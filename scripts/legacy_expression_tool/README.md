# Legacy Expression tool

With release 3.2.0 of IoT Agent Node lib, the legacy expressions language support has been removed. This folder contains
the scripts to ease to migrate the legacy expressions.

A manual migration is required, because the expressions need to be converted to JEXL expressions manually.

This python script will help you to migrate the legacy expressions to JEXL expressions. It will search for the legacy
expressions in the database and replace them with the new expressions.

This script will search for the legacy expressions in the database and replace them with the new expressions. By
default, it runs in dry-run mode, so database is not modified and the output is a series of files that can be used to
ease and verify data migration. We you are sure you want to modify the DB, then you have to enable it using the
`--commit` argument.

## Installation

This script requires Python 3 to work (it has been tested with Python 3.9 and 3.10).

It is recommended to create virtual env to run this script, installing dependencies on it, this way:

```
$ virtualenv /path/to/venv
$ source /path/to/venv/bin/active
(venv)$ pin install -r requirements.txt
```

## Output files

The script generates 4 different files each time it is executed:

### `legacy_expression_ocurrences.json`

This file contains information about the document where the legacy expressions are found. It contains the following
information for each legacy expression found:

-   \_id: The id of the document where the legacy expression is found
-   expression: The legacy expression found
-   type: The type of the property where the legacy expression is found (I.E: active.expression)
-   fiware_service: The fiware service of the document where the legacy expression is found
-   fiware_servicepath: The fiware service path of the document where the legacy expression is found

### `legacy_expression_list.json`

This file contains just a list of all the legacy expressions found in the database. It can be used to build the
translation file. The file looks like this:

```json
[
    "${legacy-expression-1}",
    "${legacy-expression-2}",
    ...
    "${legacy-expression-n}"
]
```

### `documents_replaced.json`

This file contains a list of documents where the legacy expressions are going to be replaced with all the information
associated. This file is useful to preview the changes expected to be done in the database before applying them. This
file is generated every time the script is executed, so no matter if actual changes are going to be done in the DB (i.e.
--commit is used) or not".

### `documents_backup.json`

This file contains a list of documents containing legacy expression that have been backed up. This file is useful to
preview the changes expected to be done in the database before modifying it. This file is generated every time the
script is executed, so no matter if actual changes are going to be done in the DB (i.e. --commit is used) or not".

## Command line arguments

The script can be executed using the following command:

```bash
python legacy_expression_tool.py \
    --host <mongodb-host> \
    --port <mongodb-port> \
    --database <mongodb-db> \
    --collection <mongodb-collection> \
    --translation <translation-file>
```

The list of possible arguments that the scripts accepts are:

| Argument               | Description                                                                                   | Default value                | Mandatory |
| ---------------------- | --------------------------------------------------------------------------------------------- | ---------------------------- | --------- |
| `--mongouri`           | The MongoDB URI to connect to                                                                 | `mongodb://localhost:27017/` | No        |
| `--database`           | The database name to replace the expressions                                                  | NA                           | Yes       |
| `--collection`         | The collection name to replace the expressions                                                | NA                           | Yes       |
| `--translation`        | The translation dictionary file to replace the expressions                                    | `translation.json`           | No        |
| `--debug`              | Enable debug mode                                                                             | `False`                      | No        |
| `--commit`             | Commit the changes to the database                                                            | `False`                      | No        |
| `--expressionlanguage` | What to do with the expression language field. Possibles values: `delete`, `ignore` or `jexl` | `ignore`                     | No        |
| `--statistics`         | Print match statistics. Aggregation modes are the possible values: `service` and `subservice` | `service`                    | No        |
| `--service`            | The fiware service filter to replace the expressions                                          | All subservices              | No        |
| `--service-path`       | The fiware service path filter to replace the expressions                                     | All subservices              | No        |
| `--deviceid`           | The device id filter to replace the expressions                                               | All devices                  | No        |
| `--entitytype`         | The entity type filter to replace the expressions                                             | All entity types             | No        |
| `--regexservice`       | The fiware service regex filter to replace the expressions                                    | All subservices              | No        |
| `--regexservicepath`   | The fiware service path regex filter to replace the expressions                               | All subservices              | No        |
| `--regexdeviceid`      | The device id regex filter to replace the expressions                                         | All devices                  | No        |
| `--regexentitytype`    | The entity type regex filter to replace the expressions                                       | All entity types             | No        |

Note that filters (`--service`, `--service-path`, `--deviceid` and `--entitytype`, and the regex versions) are
interpreted in additive way (i.e. like a logical AND).

## Usage

### Getting legacy expressions matches

The recommended way to use the script is to execute it in first stage without passing the commit parameter. This will
generate the file [`legacy_expression_list.json`](#legacy_expression_listjson) containing all the legacy expressions
found in the database. Then, you can use this file to build the translation file.

```bash
python legacy_expression_tool.py \
    --host <mongodb-host> \
    --port <mongodb-port> \
    --database <mongodb-db> \
    --collection <mongodb-collection>
```

This will generate 4 files. At this point, the most relevants are
[`legacy_expression_list.json`](#legacy_expression_listjson) and
[`legacy_expression_ocurrences.json`](#legacy_expression_ocurrencesjson). The first one contains a list of all the
legacy expressions found in the database. The second one contains information about the documents where the legacy
expressions are found.

## Generating translation file

It is needed to provide a translation file that contains the legacy expressions and the new JEXL expressions to replace
them. This is a json file containing an double dimensional array, having the following format:

```json
[
    [
        "legacy-expression-1",
        "legacy-expression-2",
        ...
        "legacy-expression-n"
    ],
    [
        "jexl-expression-1",
        "jexl-expression-2",
        ...
        "jexl-expression-n"
    ]
]
```

To ease the migration, you can copy the file [`legacy_expression_list.json`](#legacy_expression_listjson) generated in
previous step and manualy translate the legacy expressions to JEXL expressions. This should be done in the second array
of the double dimensional array. The first array should contain the legacy expressions. This mechanism allows to verify
that the legacy expressions are replaced correctly.

For more information about JEXL expression language you can check the [official documentation](FIXME) and the
[IoT Agent expression language documentation](../doc/api.md#expression-language-support). You can also check the
[legacy expression language documentation](https://github.com/telefonicaid/iotagent-node-lib/blob/3.1.0/doc/expressionLanguage.md#legacy-expression-language-transformations)
(deprecated).

### Verifying replacements

Once you have the translation file, you can execute the script without passing the commit parameter. This might be
helpful to check if the translation file is correct through the output files `documents_replaced.json` and
`documents_backup.json`. You can run the script using the following command:

```bash
python legacy_expression_tool.py \
    --host <mongodb-host> \
    --port <mongodb-port> \
    --database <mongodb-db> \
    --collection <mongodb-collection> \
    --translation <translation-file>
```

In order to ensure that the replacement would work you have to consider:

-   You didn't get an error while executing. If any expression is not found in the database, the script will raise an
    error `ERROR: Expression not found in translation file: ${@myexpre*100} in document: 123481a8ac03ab212ab9e0c`. Note
    that the script doesn't stop on error (if `--commit` is enabled, the expressions found in the translation file are
    translated, remaining in the DB only the ones that result in an error like this, a next pass should be done one the
    missing expression gets added to the translation document).

-   Comparing files `documents_replaced.json` and `documents_backup.json`. The first one contains the documents where
    the legacy expressions have been replaced with all the information associated. The second one contains a list of
    documents containing legacy expression that have been backed up. You can compare the files using the following
    command:

```bash
diff documents_replaced.json documents_backup.json
```

### Executing the replacement in the database

If everithing is correct, you can execute the script passing the commit parameter to apply the changes to the database.
You only have to provide the `--commit` parameter to the previous command:

```bash
python legacy_expression_tool.py \
    --host <mongodb-host> \
    --port <mongodb-port> \
    --database <mongodb-db> \
    --collection <mongodb-collection> \
    --translation <translation-file> \
    --commit
```
