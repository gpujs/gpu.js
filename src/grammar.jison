%lex

/* Decimal number definitions */
DecimalDigit 			[0-9]
DecimalDigits 			[0-9]+
NonZeroDigit 			[1-9]
SignedInteger           [+-]?{DecimalDigit}+
ExponentIndicator       [eE]
ExponentPart            {ExponentIndicator}{SignedInteger}
DecimalIntegerLiteral   {DecimalDigit}|({NonZeroDigit}{DecimalDigits}*)
DecimalLiteral          ({DecimalIntegerLiteral}\.{DecimalDigits}*{ExponentPart}?)|(\.{DecimalDigits}{ExponentPart}?)|({DecimalIntegerLiteral}{ExponentPart}?)
/* ------------------------ */

/* Octal number definitions */
OctalDigit              [0-7]
OctalIntegerLiteral     [0]{OctalDigit}+
OctalEscapeSequence     (?:[1-7][0-7]{0,2}|[0-7]{2,3})
/* ------------------------ */

/* Hex number definitions */
HexDigit                [0-9a-fA-F]
HexIntegerLiteral       [0][xX]{HexDigit}+
HexEscapeSequence       [x]{HexDigit}{2}
/* ------------------------ */

/* Identifiers and string literals */
IdentifierStart 		[?_a-zA-Z]
IdentifierPart 			{IdentifierStart}|[0-9]
Identifier 				{IdentifierStart}{IdentifierPart}*
LineContinuation        \\(\r\n|\r|\n)
SingleEscapeCharacter [\'\"\\bfnrtv]
NonEscapeCharacter [^\'\"\\bfnrtv0-9xu]
CharacterEscapeSequence {SingleEscapeCharacter}|{NonEscapeCharacter}
EscapeSequence {CharacterEscapeSequence}|{OctalEscapeSequence}|{HexEscapeSequence}
DoubleStringCharacter ([^\"\\\n\r]+)|(\\{EscapeSequence})|{LineContinuation}
SingleStringCharacter ([^\'\\\n\r]+)|(\\{EscapeSequence})|{LineContinuation}
StringLiteral (\"{DoubleStringCharacter}*\")|(\'{SingleStringCharacter}*\')
/* ------------------------ */

%options flex
%%
\s+                                {/* skip whitespace */}
"/*"(.|\r|\n)*?"*/"                {/* skip block comments */}
"//".*($|\r\n|\r|\n)               {/* skip line comments */}
{StringLiteral}                    return "STRING_LITERAL";
"else"                             return "ELSE";
"for"                              return "FOR";
"function"                         return "FUNCTION";
"if"                               return "IF";
"return"                           return "RETURN";
"this"                             return "THIS";
"var"                              return "VAR";
"true"                             return "TRUE";
"false"                            return "FALSE";
"null"                             return "NULL";
"undefined"                        return "UNDEFINED";
{Identifier}                       return "IDENTIFIER";
{DecimalLiteral}                   return "NUMERIC_LITERAL";
{HexIntegerLiteral}                return "NUMERIC_LITERAL";
{OctalIntegerLiteral}              return "NUMERIC_LITERAL";
"{"                                return "{";
"}"                                return "}";
"("                                return "(";
")"                                return ")";
"["                                return "[";
"]"                                return "]";
";"                                return ";";
","                                return ",";
"?"                                return "?";
":"                                return ":";
"==="                              return "===";
"=="                               return "==";
"="                                return "=";
"!=="                              return "!==";
"!="                               return "!=";
"!"                                return "!";
"<="                               return "<=";
"<"                                return "<";
">="                               return ">=";
">"                                return ">";
"+="                               return "+=";
"++"                               return "++";
"+"                                return "+";
"-="                               return "-=";
"--"                               return "--";
"-"                                return "-";
"*="                               return "*=";
"*"                                return "*";
"/="                               return "/=";
"/"                                return "/";
"%="                               return "%=";
"%"                                return "%";
"&&"                               return "&&";
"&="                               return "&=";
"&"                                return "&";
"||"                               return "||";
"|="                               return "|=";
"|"                                return "|";
"^="                               return "^=";
"^"                                return "^";
<<EOF>>                            return "EOF";
.                                  return "ERROR";

%%
/lex

/*
*   --------------------------------------------------
*
*   The grammer rules below here, are not yet filtered
*
*   --------------------------------------------------
*/

%start Program /* Define Start Production */
%% /* Define Grammar Productions */

Expression
    : Variable
    | AssignmentExpression
    | MatrixAccess
    | MathExpression
    | BooleanExpression
    | StringLiteral
    | "(" Expression ")"
    ;


NullLiteral
    : "NULL"
        {
            $$ = new LiteralNode(null);
        }
    ;

BooleanLiteral
    : "TRUE"
        {
            $$ = new LiteralNode(true);
        }
    | "FALSE"
        {
            $$ = new LiteralNode(false);
        }
    ;

NumericLiteral
    : "NUMERIC_LITERAL"
        {
            $$ = new LiteralNode(parseNumericLiteral($1));
        }
    ;

StringLiteral
    : "STRING_LITERAL"
        {
            $$ = new LiteralNode($1);
        }
    ;

Variable
    : "IDENTIFIER"
        {
            $$ = new IdentifierNode($1);
        }
    ;

AssignmentExpression
    : Variable "=" MathExpression
        {
            $$ = new AssignmentExpressionNode("=", $1, $3);
        }
    | Variable AssignmentOperator MathExpression
        {
            $$ = new AssignmentExpressionNode($2, $1, $3);
        }
    ;

AssignmentOperator
    : "*="
    | "/="
    | "%="
    | "+="
    | "-="
    ;

MatrixAccess
    : Variable MatrixIndexList
        {
            $$ = new MatrixAccessNode($1, $2);
        }
    ;

MatrixIndexList
    : MatrixIndexList MatrixIndex
        {
            $$ = $1.concat($2);
        }
    | MatrixIndex
        {
            $$ = [$1];
        }
    ;

MatrixIndex
    : "[" MathExpression "]"
        {
            $$ = $1;
        }
    ;

ContextAccess
    : "THIS" ContextAccessList
        {
            $$ = new ContextAccessNode($2);
        }
    ;

ContextAccessList
    : ContextAccessList ContextAccessObject
        {
            $$ = $1.concat($2);
        }
    | ContextAccessObject
        {
            $$ = [$1];
        }
    ;

ContextAccessObject
    : "." "IDENTIFIER"
        {
            $$ = $2;
        }
    ;

MathExpression
    : AdditiveExpression
        {
            $$ = new MathExpressionNode($1);
        }
    ;

PostfixMathExpression
    : NumberLiteral
    | Variable "++"
        {
            $$ = new UpdateExpressionNode("++", $1, false);
        }
    | Variable "--"
        {
            $$ = new UpdateExpressionNode("--", $1, false);
        }
    ;

UnaryMathExpression
    : PostfixMathExpression
    | UnaryMathExpr
    ;

UnaryMathExpr
    : "++" UnaryMathExpression
        {
            $$ = new UpdateExpressionNode("++", $2, true);
        }
    | "--" UnaryMathExpression
        {
            $$ = new UpdateExpressionNode("--", $2, true);
        }
    | "+" UnaryMathExpression
        {
            $$ = new UnaryExpressionNode("+", true, $2);
        }
    | "-" UnaryMathExpression
        {
            $$ = new UnaryExpressionNode("-", true, $2);
        }
    ;

MultiplicativeExpression
    : UnaryMathExpression
    | ContextAccess
    | MultiplicativeExpression "*" UnaryExpression
        {
            $$ = new BinaryExpressionNode("*", $1, $3);
        }
    | MultiplicativeExpression "/" UnaryExpression
        {
            $$ = new BinaryExpressionNode("/", $1, $3);
        }
    | MultiplicativeExpression "%" UnaryExpression
        {
            $$ = new BinaryExpressionNode("%", $1, $3);
        }
    ;

AdditiveExpression
    : MultiplicativeExpression
    | AdditiveExpression "+" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("+", $1, $3);
        }
    | AdditiveExpression "-" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("-", $1, $3);
        }
    ;

RelationalExpression
    : AdditiveExpression
    | UnaryBoolExpression
    | RelationalExpression "<" AdditiveExpression
        {
            $$ = new BinaryExpressionNode("<", $1, $3);
        }
    | RelationalExpression ">" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">", $1, $3);
        }
    | RelationalExpression "<=" AdditiveExpression
        {
            $$ = new BinaryExpressionNode("<=", $1, $3);
        }
    | RelationalExpression ">=" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">=", $1, $3);
        }
    ;

EqualityExpression
    : RelationalExpression
    | EqualityExpression "==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("==", $1, $3);
        }
    | EqualityExpression "!=" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!=", $1, $3);
        }
    | EqualityExpression "===" RelationalExpression
        {
            $$ = new BinaryExpressionNode("===", $1, $3);
        }
    | EqualityExpression "!==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!==", $1, $3);
        }
    ;

LogicalANDExpression
    : EqualityExpression
    | LogicalANDExpression "&&" BitwiseORExpression
        {
            $$ = new LogicalExpressionNode("&&", $1, $3);
        }
    ;

LogicalORExpression
    : LogicalANDExpression
    | LogicalORExpression "||" LogicalANDExpression
        {
            $$ = new LogicalExpressionNode("||", $1, $3);
        }
    ;

UnaryBoolExpr
    : "!" UnaryBoolExpr
        {
            $$ = new UnaryExpressionNode("!", true, $2);
        }
    | BooleanLiteral
    ;

Statement
    : Block
    | VariableStatement
    | ExpressionStatement
    | ForStatement
    | IfStatement
    | BreakStatement
    | ContinueStatement
    | ReturnStatement
    ;

Block
    : "{" StatementList "}"
        {
            $$ = new BlockStatementNode($2);
        }
    ;

StatementList
    : StatementList Statement
        {
            $$ = $1.concat($2);
        }
    |
        {
            $$ = [];
        }
    ;

VariableStatement
    : "VAR" Variable ";" 
        {
            $$ = new VariableDeclaratorNode($2, null);
        }
    | "VAR" AssignmentExpression ";"
        {
            $$ = new VariableDeclaratorNode($2.left, $2.right);
        }
    ;

ContinueStatement
    : "CONTINUE" ";"
        {
            $$ = new ContinueStatementNode();
        }
    ;

BreakStatement
    : "BREAK" ";"
        {
            $$ = new BreakStatementNode();
        }
    ;

ReturnStatement
    : "RETURN" ";"
        {
            $$ = new ReturnStatementNode(null);
        }
    | "RETURN" Expression ";"
        {
            $$ = new ReturnStatementNode($2);
        }
    ;

ForStatement
    : "FOR" "(" Expression ";" Expression ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($3, $5, $7, $9);
        }
    | "FOR" "(" Expression ";" Expression ";" ")" Statement
        {
            $$ = new ForStatementNode($3, $5, null, $8);
        }
    | "FOR" "(" Expression ";" ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($3, null, $6, $8);
        }
    | "FOR" "(" Expression ";" ";" ")" Statement
        {
            $$ = new ForStatementNode($3, null, null, $7);
        }
    | "FOR" "(" ";" Expression ";" Expression ")" Statement
        {
            $$ = new ForStatementNode(null, $4, $6, $8);
        }
    | "FOR" "(" ";" Expression ";" ")" Statement
        {
            $$ = new ForStatementNode(null, $4, null, $7);
        }
    | "FOR" "(" ";" ";" Expression ")" Statement
        {
            $$ = new ForStatementNode(null, null, $5, $7);
        }
    | "FOR" "(" ";" ";" ")" Statement
        {
            $$ = new ForStatementNode(null, null, null, $6);
        }
    ;

IfStatement
    : "IF" "(" Expression ")" Statement
        {
            $$ = new IfStatementNode($3, $5, null);
        }
    | "IF" "(" Expression ")" Statement "ELSE" Statement
        {
            $$ = new IfStatementNode($3, $5, $7);
        }
    ;

Program
    : SourceElements EOF
        {
            $$ = new ProgramNode($1);
            return $$;
        }
    ;

SourceElements
    : SourceElements SourceElement
        {
            $$ = $1.concat($2);
        }
    |
        {
            $$ = [];
        }
    ;

SourceElement
    : Statement
    | FunctionDeclaration
    ;

FunctionDeclaration
    : "FUNCTION" "IDENTIFIER" "(" ")" "{" FunctionBody "}"
        {
            $$ = new FunctionDeclarationNode(new IdentifierNode($2), [], $6, false, false);
        }
    | "FUNCTION" "IDENTIFIER" "(" FormalParameterList ")" "{" FunctionBody "}"
        {
            $$ = new FunctionDeclarationNode(new IdentifierNode($2), $4, $7, false, false);
        }
    ;

FormalParameterList
    : "IDENTIFIER"
        {
            $$ = [new IdentifierNode($1)];
        }
    | FormalParameterList "," "IDENTIFIER"
        {
            $$ = $1.concat(new IdentifierNode($3));
        }
    ;

FunctionBody
    : SourceElements
    ;

%%

function parseNumericLiteral(literal) {
	if (literal.charAt(0) === "0") {
		if (literal.charAt(1).toLowerCase() === "x") {
			return parseInt(literal, 16);
		} else {
			return parseInt(literal, 8);
		}
	} else {
		return Number(literal);
	}
}

/* Begin Parser Customization Methods */
var _originalParseMethod = parser.parse;

parser.parse = function(source, args) {
	parser.wasNewLine = false;
	parser.newLine = false;
	parser.restricted = false;

	return _originalParseMethod.call(this, source);
};

parser.parseError = function(str, hash) {
//		alert(JSON.stringify(hash) + "\n\n\n" + parser.newLine + "\n" + parser.wasNewLine + "\n\n" + hash.expected.indexOf("';'"));
	if (!((hash.expected && hash.expected.indexOf("';'") >= 0) && (hash.token === "}" || hash.token === "EOF" || hash.token === "BR++" || hash.token === "BR--" || parser.newLine || parser.wasNewLine))) {
		throw new SyntaxError(str);
	}
};
/* End Parser Customization Methods */

/* Begin AST Node Constructors */
function ProgramNode(body) {
	this.type = "Program";
	this.body = body;
}

function EmptyStatementNode() {
	this.type = "EmptyStatement";
}

function BlockStatementNode(body) {
	this.type = "BlockStatement";
	this.body = body;
}

function ExpressionStatementNode(expression) {
	this.type = "ExpressionStatement";
	this.expression = expression;
}

function IfStatementNode(test, consequent, alternate) {
	this.type = "IfStatement";
	this.test = test;
	this.consequent = consequent;
	this.alternate = alternate;
}

function BreakStatementNode() {
	this.type = "BreakStatement";
}

function ContinueStatementNode() {
	this.type = "ContinueStatement";
}

function ReturnStatementNode(argument) {
	this.type = "ReturnStatement";
	this.argument = argument;
}

function ForStatementNode(init, test, update, body) {
	this.type = "ForStatement";
	this.init = init;
	this.test = test;
	this.update = update;
	this.body = body;
}

function MathExpressionNode(expr) {
    this.type = "MathExpression";
    this.expr = expr;
}

function BoolExpressionNode(expr) {
    this.type = "BoolExpression";
    this.expr = expr;
}

function ContextAccessNode(layers) {
    this.type = "ContextAccess";
    this.layers = layers;
}

function FunctionDeclarationNode(id, params, body, generator, expression) {
	this.type = "FunctionDeclaration";
	this.id = id;
	this.params = params;
	this.body = body;
	this.generator = generator;
	this.expression = expression;
}

function VariableDeclaratorNode(id, init) {
	this.type = "VariableDeclarator";
	this.id = id;
	this.init = init;
}

function UnaryExpressionNode(operator, prefix, argument) {
	this.type = "UnaryExpression";
	this.operator = operator;
	this.prefix = prefix;
	this.argument = argument;
}

function BinaryExpressionNode(operator, left, right) {
	this.type = "BinaryExpression";
	this.operator = operator;
	this.left = left;
	this.right = right;
}

function AssignmentExpressionNode(operator, left, right) {
	this.type = "AssignmentExpression";
	this.operator = operator;
	this.left = left;
	this.right = right;
}

function UpdateExpressionNode(operator, argument, prefix) {
	this.type = "UpdateExpression";
	this.operator = operator;
	this.argument = argument;
	this.prefix = prefix;
}

function LogicalExpressionNode(operator, left, right) {
	this.type = "LogicalExpression";
	this.operator = operator;
	this.left = left;
	this.right = right;
}

function ConditionalExpressionNode(test, consequent, alternate) {
	this.type = "ConditionalExpression";
	this.test = test;
	this.consequent = consequent;
	this.alternate = alternate;
}

function IdentifierNode(name) {
	this.type = "Identifier";
	this.name = name;
}

function LiteralNode(value) {
	this.type = "Literal";
	this.value = value;
}

function MatrixAccessNode(name, indexes) {
    this.type = "MatrixAccess";
    this.name = name;
    this.indexes = indexes;
}

/* End AST Node Constructors */

/* Expose the AST Node Constructors */
parser.ast = {};
parser.ast.ProgramNode = ProgramNode;
parser.ast.BlockStatementNode = BlockStatementNode;
parser.ast.ExpressionStatementNode = ExpressionStatementNode;
parser.ast.IfStatementNode = IfStatementNode;
parser.ast.ForStatementNode = ForStatementNode;
parser.ast.BoolStatementNode = BoolStatementNode;
parser.ast.MathStatementNode = MathStatementNode;
parser.ast.MatrixAccessNode = MatrixAccessNode;
parser.ast.BreakStatementNode = BreakStatementNode;
parser.ast.ContinueStatementNode = ContinueStatementNode;
parser.ast.ReturnStatementNode = ReturnStatementNode;
parser.ast.ForStatementNode = ForStatementNode;
parser.ast.FunctionDeclarationNode = FunctionDeclarationNode;
parser.ast.VariableDeclaratorNode = VariableDeclaratorNode;
parser.ast.UnaryExpressionNode = UnaryExpressionNode;
parser.ast.BinaryExpressionNode = BinaryExpressionNode;
parser.ast.AssignmentExpressionNode = AssignmentExpressionNode;
parser.ast.UpdateExpressionNode = UpdateExpressionNode;
parser.ast.LogicalExpressionNode = LogicalExpressionNode;
parser.ast.IdentifierNode = IdentifierNode;
parser.ast.LiteralNode = LiteralNode;
