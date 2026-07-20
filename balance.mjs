import fs from 'fs';
import parser from '@babel/parser';
const code = fs.readFileSync('src/components/DashboardScreen.tsx','utf8');
// Walk the AST and validate JSXElement open/close balance via babel (accurate).
const ast = parser.parse(code, { sourceType:'module', plugins:['typescript','jsx'], errorRecovery:true });
import _ from 'module';
