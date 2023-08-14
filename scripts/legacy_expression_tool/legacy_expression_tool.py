# 
#  Copyright 2023 Telefonica Investigación y Desarrollo, S.A.U
# 
#  This file is part of fiware-iotagent-lib
# 
#  fiware-iotagent-lib is free software: you can redistribute it and/or
#  modify it under the terms of the GNU Affero General Public License as
#  published by the Free Software Foundation, either version 3 of the License,
#  or (at your option) any later version.
# 
#  fiware-iotagent-lib is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
#  See the GNU Affero General Public License for more details.
# 
#  You should have received a copy of the GNU Affero General Public
#  License along with fiware-iotagent-lib.
#  If not, see http://www.gnu.org/licenses/.
# 
#  Author by: Miguel Angel Pedraza
# 

from pymongo import MongoClient
from bson import json_util, ObjectId
import json
import re

from datetime import datetime

import argparse

import pandas as pd


def parse_json(data):
    return json.loads(json_util.dumps(data))

document_replaced_list = []
find_document_occurrences = []
found_legacy_expressions = []
translation_legacy_expressions = []
document_occurrences_backup = []

debug = False
commit = False
replacement_count=0


# Init time
now = datetime.now()
init_time = now.strftime("%Y%m%dT%H%M%S_")

# Create the CLI argunments parser
parser = argparse.ArgumentParser(description='Tool to migrate legacy expressions in IoT Agents')
parser.add_argument('--database', help='Database name', required=True)
parser.add_argument('--collection', help='Collection name', required=True)
parser.add_argument('--translation', help='Translation file', required=False)
parser.add_argument('--debug', help='Debug mode', required=False, action='store_true')
parser.add_argument('--commit', help='Commit changes to database', required=False, action='store_true')
parser.add_argument('--mongouri', help='Database connection URI', required=False, default='mongodb://localhost:27017/')
parser.add_argument('--expressionlanguage', help='How to handle expressionLanguage values. Can be: delete, ignore, jexl or jexlall', required=False, default='ignore')
parser.add_argument('--statistics', help='Show statistics at the end of the execution. Possible values: service subservice', required=False, default='service')
parser.add_argument('--regexservice', help='FIWARE service filter', required=False, default='.*')
parser.add_argument('--regexservicepath', help='FIWARE servicepath filter', required=False, default='.*')
parser.add_argument('--regexdeviceid', help='Device ID filter', required=False, default='.*')
parser.add_argument('--regexentitytype', help='Entity type filter', required=False, default='.*')
parser.add_argument('--service', help='FIWARE service filter', required=False)
parser.add_argument('--servicepath', help='FIWARE servicepath filter', required=False)
parser.add_argument('--deviceid', help='Device ID filter', required=False, default='')
parser.add_argument('--entitytype', help='Entity type filter', required=False)
args = vars(parser.parse_args())


if args['debug']:
    debug = True

if args['commit'] == True:
    print('INFO: Running the script in commit mode, this will update the database')
    commit = True

if args['translation'] != None and args['translation'] != '':
    with open(args['translation']) as f:
        translation_legacy_expressions = json.load(f)
elif (args['translation'] == None or args['translation'] == '') and commit == True:
    print('ERROR: Translation file is required in commit mode')
    exit(1)

mongodb_db = args['database']
mongodb_collection = args['collection']

_regex_legacy_expression = '\\${.*(@)'

# Create a filter for the query
filter = {
    '$and':[
        {'$or':[
            {'active': {'$elemMatch': {'expression': {'$regex': _regex_legacy_expression}}}},
            {'active': {'$elemMatch': {'entity_name': {'$regex': _regex_legacy_expression}}}},
            {'active': {'$elemMatch': {'reverse': {'$elemMatch': {'expression':{'$regex': _regex_legacy_expression}}}}}},
            {'attributes': {'$elemMatch': {'expression': {'$regex': _regex_legacy_expression}}}},                                # grups
            {'attributes': {'$elemMatch': {'entity_name': {'$regex': _regex_legacy_expression}}}},                               # grups
            {'attributes': {'$elemMatch': {'reverse': {'$elemMatch': {'expression':{'$regex': _regex_legacy_expression}}}}}},    # grups
            {'commands': {'$elemMatch': {'expression': {'$regex': _regex_legacy_expression}}}},
            {'endpoint': {'$regex': _regex_legacy_expression}},
            {'entityNameExp': {'$regex': _regex_legacy_expression}},
            {'explicitAttrs': {'$regex': _regex_legacy_expression}},
            ]
        }
        ]
}

if args['expressionlanguage'] == 'delete':
    filter['$and'][0]['$or'].append({'expressionLanguage':{'$exists': True}})
    expressionlanguage = 'delete'
elif args['expressionlanguage'] == 'jexlall':
    filter['$and'][0]['$or'].append({'expressionLanguage':{'$exists': True}})
    expressionlanguage = 'jexlall'
elif args['expressionlanguage'] == 'jexl':
    expressionlanguage = 'jexl'
else:
    expressionlanguage = 'ignore'

if args['regexdeviceid'] != '.*':
    filter_device_id = args['regexdeviceid']
    filter['$and'].append({'id': {'$regex': filter_device_id}})
    if debug:
        print('Filtering by regex device ID: ' + str(filter_device_id))

if args['regexentitytype'] != '.*':
    filter_entity_type = args['regexentitytype']
    filter['$and'].append({'type': {'$regex': filter_entity_type}})
    if debug:
        print('Filtering by regex entity type: ' + str(filter_entity_type))

if args['regexservice'] != '.*':
    fiware_service = args['regexservice']
    filter['$and'].append({'service': {'$regex': fiware_service}})
    if debug:
        print('Filtering by regex service: ' + str(fiware_service))

if args['regexservicepath'] != '.*':
    fiware_servicepath = args['regexservicepath']
    filter['$and'].append({'subservice': {'$regex': fiware_servicepath}})
    if debug:
        print('Filtering by regex servicepath: ' + fiware_servicepath)

if args['deviceid']:
    filter['$and'].append({'id': args['deviceid']})
    if debug:
        print('Filtering by device ID: ' + str(args['deviceid']))

if args['entitytype']:
    filter['$and'].append({'type': args['entitytype']})
    if debug:
        print('Filtering by entity type: ' + str(args['entitytype']))

if args['service']:
    filter['$and'].append({'service': args['service']})
    if debug:
        print('Filtering by service: ' + str(args['service']))

if args['servicepath']:
    filter['$and'].append({'subservice': args['servicepath']})
    if debug:
        print('Filtering by servicepath: ' + str(args['servicepath']))  

# Create a client instance of the MongoClient class
if debug:
    print('Connected to: '+str(args['mongouri']))
client = MongoClient(args['mongouri']) # Create a client instance of the MongoClient class

if debug:
    print('Running in debug mode')
    print('MongoDB Query: ' + str(filter))

# Execute find query
result_cursor = client[mongodb_db][mongodb_collection].find(
    filter=filter
)

# Loop through the results
for occurrence in result_cursor:

    # Append the expression to the backup list
    document_occurrences_backup.append(parse_json(occurrence))
    
    occurrence_id = str(occurrence['_id'])

    # Find the legacy expressions and replace them
    if 'active' in occurrence:
        for active in occurrence['active']:
            if 'expression' in active:
                if re.search(_regex_legacy_expression, active['expression']):
                                                            
                    if active['expression'] not in found_legacy_expressions:
                        found_legacy_expressions.append(active['expression'])
                    find_document_occurrences.append({'_id':occurrence_id, 'expression':active['expression'], 'type':'active.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(active['expression'])})
                    if debug:
                        print ('ocurrence: ' + occurrence_id + ' active: ' + str(active['expression']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if active['expression'] in translation_legacy_expressions[0]:
                            active['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(active['expression'])]
                            if debug:
                                print(' Replaced expression: "' + active['expression'] + '" in document: ' + occurrence_id)
                        else:
                            print('ERROR: Expression not found in translation file: ' + active['expression'] + ' in document: ' + occurrence_id)
                        
            if 'entity_name' in active:
                if re.search(_regex_legacy_expression, active['entity_name']):
                    if active['entity_name'] not in found_legacy_expressions:
                        found_legacy_expressions.append(active['entity_name'])
                    find_document_occurrences.append({'_id':occurrence_id, 'expression':active['entity_name'], 'type':'active.entity_name', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(active['entity_name'])})
                    if debug:
                        print ('ocurrence: ' + occurrence_id + ' active: ' + str(active['entity_name']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if active['entity_name'] in translation_legacy_expressions[0]:
                            active['entity_name'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(active['entity_name'])]
                            if debug:
                                print(' Replaced expression: "' + active['entity_name'] + '" in document: ' + occurrence_id)
                        else:
                            print('ERROR: Expression not found in translation file: ' + active['entity_name'] + ' in document: ' + occurrence_id)

            if 'reverse' in active:
                    if 'expression' in active['reverse']:
                        if re.search(_regex_legacy_expression, active['reverse']['expression']):
                            if active['reverse']['expression'] not in found_legacy_expressions:
                                found_legacy_expressions.append(active['reverse']['expression'])
                            find_document_occurrences.append({'_id':occurrence_id, 'expression':active['reverse']['expression'], 'type':'active.reverse.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(active['reverse']['expression'])})
                            if debug:
                                print ('ocurrence: ' + occurrence_id + ' active: ' + str(active['reverse']['expression']))
                            if translation_legacy_expressions!=[]:
                                # Do the replacement of the legacy expression
                                if active['reverse']['expression'] in translation_legacy_expressions[0]:
                                    active['reverse']['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(active['reverse']['expression'])]
                                    if debug:
                                        print(' Replaced expression: "' + active['reverse']['expression'] + '" in document: ' + occurrence_id)
                                else:
                                    print('ERROR: Expression not found in translation file: ' + active['reverse']['expression'] + ' in document: ' + occurrence_id)

    if 'attributes' in occurrence:
        for attribute in occurrence['attributes']:
            if 'expression' in attribute:
                if re.search(_regex_legacy_expression, attribute['expression']):
                    if attribute['expression'] not in found_legacy_expressions:
                        found_legacy_expressions.append(attribute['expression'])
                    find_document_occurrences.append({'_id':occurrence_id, 'expression':attribute['expression'], 'type':'attribute.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(attribute['expression'])})
                    if debug:
                        print ('ocurrence: ' + occurrence_id + ' attribute: ' + str(attribute['expression']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if attribute['expression'] in translation_legacy_expressions[0]:
                            attribute['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(attribute['expression'])]
                            if debug:
                                print(' Replaced expression: "' + attribute['expression'] + '" in document: ' + occurrence_id)
                        else:
                            print('ERROR: Expression not found in translation file: ' + attribute['expression'] + ' in document: ' + occurrence_id)

            if 'entity_name' in attribute:
                if re.search(_regex_legacy_expression, attribute['entity_name']):
                    if attribute['entity_name'] not in found_legacy_expressions:
                        found_legacy_expressions.append(attribute['entity_name'])
                    find_document_occurrences.append({'_id':occurrence_id, 'expression':attribute['entity_name'], 'type':'attribute.entity_name', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(attribute['entity_name'])})
                    if debug:
                        print ('ocurrence: ' + occurrence_id + ' attribute: ' + str(attribute['entity_name']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if attribute['entity_name'] in translation_legacy_expressions[0]:
                            attribute['entity_name'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(attribute['entity_name'])]
                            if debug:
                                print(' Replaced expression: "' + attribute['entity_name'] + '" in document: ' + occurrence_id)
                        else:
                            print('ERROR: Expression not found in translation file: ' + attribute['entity_name'] + ' in document: ' + occurrence_id)

            if 'reverse' in attribute:  
                if 'expression' in attribute['reverse']:
                    if re.search(_regex_legacy_expression, attribute['reverse']['expression']):
                        if attribute['reverse']['expression'] not in found_legacy_expressions:
                            found_legacy_expressions.append(attribute['reverse']['expression'])
                        find_document_occurrences.append({'_id':occurrence_id, 'expression':attribute['reverse']['expression'], 'type':'attribute.reverse.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(attribute['reverse']['expression'])})
                        if debug:
                            print ('ocurrence: ' + occurrence_id + ' attribute: ' + str(attribute['reverse']['expression']))
                        if translation_legacy_expressions!=[]:
                            # Do the replacement of the legacy expression
                            if attribute['reverse']['expression'] in translation_legacy_expressions[0]:
                                attribute['reverse']['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(attribute['reverse']['expression'])]
                                if debug:
                                    print(' Replaced expression: "' + attribute['reverse']['expression'] + '" in document: ' + occurrence_id)
                            else:
                                print('ERROR: Expression not found in translation file: ' + attribute['reverse']['expression'] + ' in document: ' + occurrence_id)
    
    if 'commands' in occurrence:
        for command in occurrence['commands']:
            if 'expression' in command:
                if re.search(_regex_legacy_expression, command['expression']):
                    if command['expression'] not in found_legacy_expressions:
                        found_legacy_expressions.append(command['expression'])
                    find_document_occurrences.append({'_id':occurrence_id, 'expression':command['expression'], 'type':'command.expression', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(command['expression'])})
                    if debug:
                        print ('ocurrence: ' + occurrence_id + ' command: ' + str(command['expression']))
                    if translation_legacy_expressions!=[]:
                        # Do the replacement of the legacy expression
                        if command['expression'] in translation_legacy_expressions[0]:
                            command['expression'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(command['expression'])]
                            if debug:
                                print(' Replaced expression: "' + command['expression'] + '" in document: ' + occurrence_id)
                        else:
                            print('ERROR: Expression not found in translation file: ' + command['expression'] + ' in document: ' + occurrence_id)
            
    if 'endpoint' in occurrence:
        if re.search(_regex_legacy_expression, occurrence['endpoint']):
            if occurrence['endpoint'] not in found_legacy_expressions:
                found_legacy_expressions.append(occurrence['endpoint'])
            find_document_occurrences.append({'_id':occurrence_id, 'expression':occurrence['endpoint'], 'type':'endpoint', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(occurrence['endpoint'])})
            if debug:
                print ('ocurrence: ' + occurrence_id + ' endpoint: ' + str(occurrence['endpoint']))
            if translation_legacy_expressions!=[]:
                # Do the replacement of the legacy expression
                if occurrence['endpoint'] in translation_legacy_expressions[0]:
                    occurrence['endpoint'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(occurrence['endpoint'])]
                    if debug:
                        print(' Replaced expression: "' + occurrence['endpoint'] + '" in document: ' + occurrence_id)
                else:
                    print('ERROR: Expression not found in translation file: ' + occurrence['endpoint'] + ' in document: ' + occurrence_id)

    if 'entityNameExp' in occurrence:
        if re.search(_regex_legacy_expression, occurrence['entityNameExp']):
            if occurrence['entityNameExp'] not in found_legacy_expressions:
                found_legacy_expressions.append(occurrence['entityNameExp'])
            find_document_occurrences.append({'_id':occurrence_id, 'expression':occurrence['entityNameExp'], 'type':'entityNameExp', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(occurrence['entityNameExp'])})
            if debug:
                print ('ocurrence: ' + occurrence_id + ' entityNameExp: ' + str(occurrence['entityNameExp']))
            if translation_legacy_expressions!=[]:
                # Do the replacement of the legacy expression
                if occurrence['entityNameExp'] in translation_legacy_expressions[0]:
                    occurrence['entityNameExp'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(occurrence['entityNameExp'])]
                    if debug:
                        print(' Replaced expression: "' + occurrence['entityNameExp'] + '" in document: ' + occurrence_id)
                else:
                    print('ERROR: Expression not found in translation file: ' + occurrence['entityNameExp'] + ' in document: ' + occurrence_id)

    if 'explicitAttrs' in occurrence:
        if re.search(_regex_legacy_expression, str(occurrence['explicitAttrs'])):       # Note that explicitAttrs can be a boolean value. For that reason, we convert ocurrence['explicitAttrs'] to string, otherwise "TypeError: expected string or bytes-like object" will be raised
            if occurrence['explicitAttrs'] not in found_legacy_expressions:
                found_legacy_expressions.append(occurrence['explicitAttrs'])
            find_document_occurrences.append({'_id':occurrence_id, 'expression':occurrence['explicitAttrs'], 'type':'explicitAttrs', 'service':occurrence['service'], 'subservice':occurrence['subservice'], 'expressionIndex':found_legacy_expressions.index(occurrence['explicitAttrs'])})
            if debug:
                print ('ocurrence: ' + occurrence_id + ' explicitAttrs: ' + str(occurrence['explicitAttrs']))
            if translation_legacy_expressions!=[]:
                # Do the replacement of the legacy expression
                if occurrence['explicitAttrs'] in translation_legacy_expressions[0]:
                    occurrence['explicitAttrs'] = translation_legacy_expressions[1][translation_legacy_expressions[0].index(occurrence['explicitAttrs'])]
                    if debug:
                        print(' Replaced expression: "' + occurrence['explicitAttrs'] + '" in document: ' + occurrence_id)
                else:
                    print('ERROR: Expression not found in translation file: ' + occurrence['explicitAttrs'] + ' in document: ' + occurrence_id)
    
    if 'expressionLanguage' in occurrence:
        if expressionlanguage == 'delete':
            if debug:
                print ('ocurrence: ' + occurrence_id + ' expressionLanguage: ' + str(occurrence['expressionLanguage']))
            del occurrence['expressionLanguage']
        elif expressionlanguage == 'jexl' or expressionlanguage == 'jexlall':
            if debug:
                print ('ocurrence: ' + occurrence_id + ' expressionLanguage: ' + str(occurrence['expressionLanguage']))
            occurrence['expressionLanguage'] = 'jexl'
    else:
        if expressionlanguage == 'jexl' or expressionlanguage == 'jexlall':    
            if debug:
                print ('ocurrence: ' + occurrence_id + ' expressionLanguage: ' + 'undefined')
            occurrence['expressionLanguage'] = 'jexl'


    # Update element in the database
    if commit and translation_legacy_expressions!=[]:
        client[mongodb_db][mongodb_collection].replace_one(
            {'_id': occurrence['_id']},
            occurrence
        )
        replacement_count+=1

    # Update element in the list of documents with 
    document_replaced_list.append(parse_json(occurrence))

# Print the counts
print ('\nFound ' + str(len(find_document_occurrences)) + ' legacy expressions in ' + str(len(document_replaced_list)) + ' documents')
if commit:
    print ('Updated ' + str(replacement_count) + ' documents in the database')
    
# write the results to files
f1 = open(init_time+"legacy_expression_occurrences.json", "w")
f1.write(json.dumps(find_document_occurrences,indent=4))
f1.close()
f2 = open(init_time+"legacy_expressions_list.json", "w")
f2.write(json.dumps(found_legacy_expressions,indent=4))
f2.close()
f3 = open(init_time+"documents_replaced.json", "w")
f3.write(json.dumps(document_replaced_list,indent=4))
f3.close()
f4 = open(init_time+"documents_backup.json", "w")
f4.write(json.dumps(document_occurrences_backup,indent=4))
f4.close()

if args['statistics']:
    
    # Load data into pandas dataframe
    df = pd.DataFrame(find_document_occurrences, columns=['_id', 'expression', 'type', 'service', 'subservice', 'expressionIndex'])

    # Configure pandas to display all data
    pd.set_option('expand_frame_repr', False)
    pd.set_option('display.max_rows', None)  # more options can be specified also
    pd.set_option('display.max_columns', None)  # more options can be specified also

    table_collums = ['service']

    if args['statistics'] == 'subservice':
        table_collums.append('subservice')

    new = df.pivot_table(index='expression', columns=table_collums, values=['_id'], aggfunc='count', fill_value=0, margins=True)
    
    # Display all data
    print(new)
