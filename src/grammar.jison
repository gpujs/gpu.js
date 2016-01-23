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
(\r\n|\r|\n)+\s*"++"               return "BR++"; /* Handle restricted postfix production */
(\r\n|\r|\n)+\s*"--"               return "BR--"; /* Handle restricted postfix production */
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
"void"                             return "VOID";
"true"                             return "TRUE";
"false"                            return "FALSE";
"null"                             return "NULL";
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

Statement
    : Block
    | VariableStatement
    | EmptyStatement
    | ExpressionStatement
    | IfStatement
    | IterationStatement
    | ContinueStatement
    | BreakStatement
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
    : "VAR" VariableDeclarationList
        {
            $$ = new VariableDeclarationNode($2, "var");
        }
    ;

VariableDeclarationList
    : VariableDeclaration
        {
            $$ = [$1];
        }
    | VariableDeclarationList "," VariableDeclaration
        {
            $$ = $1.concat($3);
        }
    ;

VariableDeclaration
    : "IDENTIFIER"
        {
            $$ = new VariableDeclaratorNode(new IdentifierNode($1), null);
        }
    | "IDENTIFIER" Initialiser
        {
            $$ = new VariableDeclaratorNode(new IdentifierNode($1), $2);
        }
    ;

Initialiser
    : "=" AssignmentExpression
        {
            $$ = $2;
        }
    ;

EmptyStatement
    : ";"
        {
            $$ = new EmptyStatementNode();
        }
    ;

ExpressionStatement
    : ExpressionNoBF ";"
        {
            $$ = new ExpressionStatementNode($1, createSourceLocation(null, @1, @2));
        }
    | ExpressionNoBF error
        {
            $$ = new ExpressionStatementNode($1, createSourceLocation(null, @1, @1));
        }
    ;

IfStatement
    : "IF" "(" Expression ")" Statement
        {
            $$ = new IfStatementNode($3, $5, null, createSourceLocation(null, @1, @5));
        }
    | "IF" "(" Expression ")" Statement "ELSE" Statement
        {
            $$ = new IfStatementNode($3, $5, $7, createSourceLocation(null, @1, @7));
        }
    ;

IterationStatement
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
    | "FOR" "(" "VAR" VariableDeclarationList ";" Expression ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($4, $6, $8, $10);
        }
    | "FOR" "(" "VAR" VariableDeclarationList ";" Expression ";" ")" Statement
        {
            $$ = new ForStatementNode($4, $6, null, $9);
        }
    | "FOR" "(" "VAR" VariableDeclarationList ";" ";" Expression ")" Statement
        {
            $$ = new ForStatementNode($4, null, $7, $9);
        }
    | "FOR" "(" "VAR" VariableDeclarationList ";" ";" ")" Statement
        {
            $$ = new ForStatementNode($4, null, null, $8);
        }
    ;

ContinueStatement
    : "CONTINUE" ";"
        {
            $$ = new ContinueStatementNode(null);
        }
    | "CONTINUE" error
        {
            $$ = new ContinueStatementNode(null);
        }
    | "CONTINUE" "IDENTIFIER" ";"
        {
            $$ = new ContinueStatementNode(new IdentifierNode($2));
        }
    | "CONTINUE" "IDENTIFIER" error
        {
            $$ = new ContinueStatementNode(new IdentifierNode($2));
        }
    ;

BreakStatement
    : "BREAK" ";"
        {
            $$ = new BreakStatementNode(null);
        }
    | "BREAK" error
        {
            $$ = new BreakStatementNode(null);
        }
    | "BREAK" "IDENTIFIER" ";"
        {
            $$ = new BreakStatementNode(new IdentifierNode($2));
        }
    | "BREAK" "IDENTIFIER" error
        {
            $$ = new BreakStatementNode(new IdentifierNode($2));
        }
    ;

ReturnStatement
    : "RETURN" ";"
        {
            $$ = new ReturnStatementNode(null);
        }
    | "RETURN" error
        {
            $$ = new ReturnStatementNode(null);
        }
    | "RETURN" Expression ";"
        {
            $$ = new ReturnStatementNode($2);
        }
    | "RETURN" Expression error
        {
            $$ = new ReturnStatementNode($2);
        }
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

FunctionExpression
    : "FUNCTION" "IDENTIFIER" "(" ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(new IdentifierNode($2), [], $6, false, false);
        }
    | "FUNCTION" "IDENTIFIER" "(" FormalParameterList ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(new IdentifierNode($2), $4, $7, false, false);
        }
    | "FUNCTION" "(" ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(null, [], $5, false, false);
        }
    | "FUNCTION" "(" FormalParameterList ")" "{" FunctionBody "}"
        {
	    $$ = new FunctionExpressionNode(null, $3, $6, false, false);
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

PrimaryExpression
    : PrimaryExpressionNoBrace
    | ObjectLiteral
    ;

PrimaryExpressionNoBrace
    : "THIS"
        {
            $$ = new ThisExpressionNode();
        }
    | "IDENTIFIER"
        {
            $$ = new IdentifierNode($1);
        }
    | Literal
    | ArrayLiteral
    | "(" Expression ")"
        {
            $$ = $2;
        }
    ;

ArrayLiteral
    : "[" "]"
        {
            $$ = new ArrayExpressionNode([]);
        }
    | "[" Elision "]"
        {
            $$ = new ArrayExpressionNode($2);
        }
    | "[" ElementList "]"
        {
            $$ = new ArrayExpressionNode($2);
        }
    | "[" ElementList "," "]"
        {
            $$ = new ArrayExpressionNode($2.concat(null));
        }
    | "[" ElementList "," Elision "]"
        {
            $$ = new ArrayExpressionNode($2.concat($4));
        }
    ;

ElementList
    : AssignmentExpression
        {
            $$ = [$1];
        }
    | Elision AssignmentExpression
        {
            $$ = $1.concat($2);
        }
    | ElementList "," AssignmentExpression
        {
            $$ = $1.concat($3);
        }
    | ElementList "," Elision AssignmentExpression
        {
            $$ = $1.concat($3).concat($4);
        }
    ;

Elision
    : ","
        {
            $$ = [null, null];
        }
    | Elision ","
        {
            $$ = $1.concat(null);
        }
    ;

ObjectLiteral
    : "{" "}"
        {
            $$ = new ObjectExpressionNode([]);
        }
    | "{" PropertyNameAndValueList "}"
        {
            $$ = new ObjectExpressionNode($2);
        }
    | "{" PropertyNameAndValueList "," "}"
        {
            $$ = new ObjectExpressionNode($2);
        }
    ;

PropertyNameAndValueList
    : PropertyAssignment
        {
            $$ = [$1];
        }
    | PropertyNameAndValueList "," PropertyAssignment
        {
            $$ = $1.concat($3);
        }
    ;

PropertyAssignment
    : PropertyName ":" AssignmentExpression
        {
            $$ = {key: $1, value: $3, kind: "init"};
        }
    | "IDENTIFIER" PropertyName "(" ")" "{" FunctionBody "}"
        {
            if ($1 === "get") {
                $$ = {key: $2, value: (new FunctionExpressionNode(null, [], $6, false, false)), kind: "get"};
            } else {
                this.parseError("Invalid getter", {});
            }
        }
    | "IDENTIFIER" PropertyName "(" PropertySetParameterList ")" "{" FunctionBody "}"
        {
            if ($1 === "set") {
                $$ = {key: $2, value: (new FunctionExpressionNode(null, $4, $7, false, false)), kind: "set"};
            } else {
                this.parseError("Invalid setter", {});
            }
        }
    ;

PropertyName
    : IdentifierName
    | StringLiteral
    | NumericLiteral
    ;

PropertySetParameterList
    : "IDENTIFIER"
        {
            $$ = [new IdentifierNode($1)];
        }
    ;

MemberExpression
    : PrimaryExpression
    | FunctionExpression
    | MemberExpression "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true);
        }
    | MemberExpression "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false);
        }
    | "NEW" MemberExpression Arguments
        {
            $$ = new NewExpressionNode($2, $3);
        }
    ;

MemberExpressionNoBF
    : PrimaryExpressionNoBrace
    | MemberExpressionNoBF "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true);
        }
    | MemberExpressionNoBF "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false);
        }
    | "NEW" MemberExpression Arguments
        {
            $$ = new NewExpressionNode($2, $3);
        }
    ;

NewExpression
    : MemberExpression
    | "NEW" NewExpression
        {
            $$ = new NewExpressionNode($2, null);
        }
    ;

NewExpressionNoBF
    : MemberExpressionNoBF
    | "NEW" NewExpression
        {
            $$ = new NewExpressionNode($2, null);
        }
    ;

CallExpression
    : MemberExpression Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpression Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpression "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true, createSourceLocation(null, @1, @4));
        }
    | CallExpression "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false, createSourceLocation(null, @1, @3));
        }
    ;

CallExpressionNoBF
    : MemberExpressionNoBF Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpressionNoBF Arguments
        {
            $$ = new CallExpressionNode($1, $2, createSourceLocation(null, @1, @2));
        }
    | CallExpressionNoBF "[" Expression "]"
        {
            $$ = new MemberExpressionNode($1, $3, true, createSourceLocation(null, @1, @4));
        }
    | CallExpressionNoBF "." IdentifierName
        {
            $$ = new MemberExpressionNode($1, $3, false, createSourceLocation(null, @1, @3));
        }
    ;

IdentifierName
    : "IDENTIFIER"
        {
            $$ = new IdentifierNode($1, createSourceLocation(null, @1, @1));
        }
    | ReservedWord
        {
            $$ = new IdentifierNode($1, createSourceLocation(null, @1, @1));
        }
    ;

Arguments
    : "(" ")"
        {
            $$ = [];
        }
    | "(" ArgumentList ")"
        {
            $$ = $2;
        }
    ;

ArgumentList
    : AssignmentExpression
        {
            $$ = [$1];
        }
    | ArgumentList "," AssignmentExpression
        {
            $$ = $1.concat($3);
        }
    ;

LeftHandSideExpression
    : NewExpression
    | CallExpression
    ;

LeftHandSideExpressionNoBF
    : NewExpressionNoBF
    | CallExpressionNoBF
    ;

PostfixExpression
    : LeftHandSideExpression
    | LeftHandSideExpression "++"
        {
            $$ = new UpdateExpressionNode("++", $1, false, createSourceLocation(null, @1, @2));
        }
    | LeftHandSideExpression "--"
        {
            $$ = new UpdateExpressionNode("--", $1, false, createSourceLocation(null, @1, @2));
        }
    ;

PostfixExpressionNoBF
    : LeftHandSideExpressionNoBF
    | LeftHandSideExpressionNoBF "++"
        {
            $$ = new UpdateExpressionNode("++", $1, false, createSourceLocation(null, @1, @2));
        }
    | LeftHandSideExpressionNoBF "--"
        {
            $$ = new UpdateExpressionNode("--", $1, false, createSourceLocation(null, @1, @2));
        }
    ;

UnaryExpression
    : PostfixExpression
    | UnaryExpr
    ;

UnaryExpressionNoBF
    : PostfixExpressionNoBF
    | UnaryExpr
    ;

UnaryExpr
    : "VOID" UnaryExpression
        {
            $$ = new UnaryExpressionNode("void", true, $2, createSourceLocation(null, @1, @2));
        }
    | "BR++" UnaryExpression
        {
            @1.first_line = @1.last_line;
            @1.first_column = @1.last_column - 2;
            $$ = new UpdateExpressionNode("++", $2, true, createSourceLocation(null, @1, @2));
        }
    | "BR--" UnaryExpression
        {
            @1.first_line = @1.last_line;
            @1.first_column = @1.last_column - 2;
            $$ = new UpdateExpressionNode("--", $2, true, createSourceLocation(null, @1, @2));
        }
    | "++" UnaryExpression
        {
            $$ = new UpdateExpressionNode("++", $2, true, createSourceLocation(null, @1, @2));
        }
    | "--" UnaryExpression
        {
            $$ = new UpdateExpressionNode("--", $2, true, createSourceLocation(null, @1, @2));
        }
    | "+" UnaryExpression
        {
            $$ = new UnaryExpressionNode("+", true, $2, createSourceLocation(null, @1, @2));
        }
    | "-" UnaryExpression
        {
            $$ = new UnaryExpressionNode("-", true, $2, createSourceLocation(null, @1, @2));
        }
    | "~" UnaryExpression
        {
            $$ = new UnaryExpressionNode("~", true, $2, createSourceLocation(null, @1, @2));
        }
    | "!" UnaryExpression
        {
            $$ = new UnaryExpressionNode("!", true, $2, createSourceLocation(null, @1, @2));
        }
    ;

MultiplicativeExpression
    : UnaryExpression
    | MultiplicativeExpression "*" UnaryExpression
        {
            $$ = new BinaryExpressionNode("*", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpression "/" UnaryExpression
        {
            $$ = new BinaryExpressionNode("/", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpression "%" UnaryExpression
        {
            $$ = new BinaryExpressionNode("%", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

MultiplicativeExpressionNoBF
    : UnaryExpressionNoBF
    | MultiplicativeExpressionNoBF "*" UnaryExpression
        {
            $$ = new BinaryExpressionNode("*", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpressionNoBF "/" UnaryExpression
        {
            $$ = new BinaryExpressionNode("/", $1, $3, createSourceLocation(null, @1, @3));
        }
    | MultiplicativeExpressionNoBF "%" UnaryExpression
        {
            $$ = new BinaryExpressionNode("%", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AdditiveExpression
    : MultiplicativeExpression
    | AdditiveExpression "+" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("+", $1, $3, createSourceLocation(null, @1, @3));
        }
    | AdditiveExpression "-" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("-", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AdditiveExpressionNoBF
    : MultiplicativeExpressionNoBF
    | AdditiveExpressionNoBF "+" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("+", $1, $3, createSourceLocation(null, @1, @3));
        }
    | AdditiveExpressionNoBF "-" MultiplicativeExpression
        {
            $$ = new BinaryExpressionNode("-", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

ShiftExpression
    : AdditiveExpression
    | ShiftExpression "<<" AdditiveExpression
        {
            $$ = new BinaryExpressionNode("<<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpression ">>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpression ">>>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>>", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

ShiftExpressionNoBF
    : AdditiveExpressionNoBF
    | ShiftExpressionNoBF "<<" AdditiveExpression
        {
            $$ = new BinaryExpressionNode("<<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpressionNoBF ">>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>", $1, $3, createSourceLocation(null, @1, @3));
        }
    | ShiftExpressionNoBF ">>>" AdditiveExpression
        {
            $$ = new BinaryExpressionNode(">>>", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

RelationalExpression
    : ShiftExpression
    | RelationalExpression "<" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression ">" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression "<=" ShiftExpression
        {
            $$ = new BinaryExpressionNode("<=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | RelationalExpression ">=" ShiftExpression
        {
            $$ = new BinaryExpressionNode(">=", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

EqualityExpression
    : RelationalExpression
    | EqualityExpression "==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("==", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpression "!=" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpression "===" RelationalExpression
        {
            $$ = new BinaryExpressionNode("===", $1, $3, createSourceLocation(null, @1, @3));
        }
    | EqualityExpression "!==" RelationalExpression
        {
            $$ = new BinaryExpressionNode("!==", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseANDExpression
    : EqualityExpression
    | BitwiseANDExpression "&" EqualityExpression
        {
            $$ = new BinaryExpressionNode("&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseXORExpression
    : BitwiseANDExpression
    | BitwiseXORExpression "^" BitwiseANDExpression
        {
            $$ = new BinaryExpressionNode("^", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

BitwiseORExpression
    : BitwiseXORExpression
    | BitwiseORExpression "|" BitwiseXORExpression
        {
            $$ = new BinaryExpressionNode("|", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalANDExpression
    : BitwiseORExpression
    | LogicalANDExpression "&&" BitwiseORExpression
        {
            $$ = new LogicalExpressionNode("&&", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

LogicalORExpression
    : LogicalANDExpression
    | LogicalORExpression "||" LogicalANDExpression
        {
            $$ = new LogicalExpressionNode("||", $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

ConditionalExpression
    : LogicalORExpression
    | LogicalORExpression "?" AssignmentExpression ":" AssignmentExpression
        {
            $$ = new ConditionalExpressionNode($1, $3, $5, createSourceLocation(null, @1, @5));
        }
    ;

ConditionalExpressionNoBF
    : LogicalORExpressionNoBF
    | LogicalORExpressionNoBF "?" AssignmentExpression ":" AssignmentExpression
        {
            $$ = new ConditionalExpressionNode($1, $3, $5, createSourceLocation(null, @1, @5));
        }
    ;

AssignmentExpression
    : ConditionalExpression
    | LeftHandSideExpression "=" AssignmentExpression
        {
            $$ = new AssignmentExpressionNode("=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | LeftHandSideExpression AssignmentOperator AssignmentExpression
        {
            $$ = new AssignmentExpressionNode($2, $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AssignmentExpressionNoBF
    : ConditionalExpressionNoBF
    | LeftHandSideExpressionNoBF "=" AssignmentExpression
        {
            $$ = new AssignmentExpressionNode("=", $1, $3, createSourceLocation(null, @1, @3));
        }
    | LeftHandSideExpressionNoBF AssignmentOperator AssignmentExpression
        {
            $$ = new AssignmentExpressionNode($2, $1, $3, createSourceLocation(null, @1, @3));
        }
    ;

AssignmentOperator
    : "*="
    | "/="
    | "%="
    | "+="
    | "-="
    | "&="
    | "^="
    | "|="
    ;

Expression
    : AssignmentExpression
    | Expression "," AssignmentExpression
        {
            if ($1.type === "SequenceExpression") {
                $1.expressions.concat($3);
                $1.loc = createSourceLocation(null, @1, @3);
                $$ = $1;
            } else {
                $$ = new SequenceExpressionNode([$1, $3], createSourceLocation(null, @1, @3));
            }
        }
    ;

ExpressionNoBF
    : AssignmentExpressionNoBF
    | ExpressionNoBF "," AssignmentExpression
        {
            if ($1.type === "SequenceExpression") {
                $1.expressions.concat($3);
                $1.loc = createSourceLocation(null, @1, @3);
                $$ = $1;
            } else {
                $$ = new SequenceExpressionNode([$1, $3], createSourceLocation(null, @1, @3));
            }
        }
    ;

Literal
    : NullLiteral
    | BooleanLiteral
    | NumericLiteral
    | StringLiteral
    ;

NullLiteral
    : "NULL"
        {
            $$ = new LiteralNode(null, createSourceLocation(null, @1, @1));
        }
    ;

BooleanLiteral
    : "TRUE"
        {
            $$ = new LiteralNode(true, createSourceLocation(null, @1, @1));
        }
    | "FALSE"
        {
            $$ = new LiteralNode(false, createSourceLocation(null, @1, @1));
        }
    ;

NumericLiteral
    : "NUMERIC_LITERAL"
        {
            $$ = new LiteralNode(parseNumericLiteral($1), createSourceLocation(null, @1, @1));
        }
    ;

StringLiteral
    : "STRING_LITERAL"
        {
            $$ = new LiteralNode($1, createSourceLocation(null, @1, @1));
        }
    ;

ReservedWord
    : "BREAK"
    | "CONTINUE"
    | "ELSE"
    | "FINALLY"
    | "FOR"
    | "FUNCTION"
    | "IF"
    | "RETURN"
    | "THIS"
    | "VAR"
    | "VOID"
    | "WHILE"
    | "TRUE"
    | "FALSE"
    | "NULL"
    ;

%%

function parseRegularExpressionLiteral(literal) {
	var last = literal.lastIndexOf("/");
	var body = literal.substring(1, last);
	var flags = literal.substring(last + 1);

	return new RegExp(body, flags);
}

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

function BkStatementNode(body) {
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

function LabeledStatementNode(label, body) {
	this.type = "LabeledStatement";
	this.label = label;
	this.body = body;
}

function BreakStatementNode(label) {
	this.type = "BreakStatement";
	this.label = label;
}

function ContinueStatementNode(label) {
	this.type = "ContinueStatement";
	this.label = label;
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

function FunctionDeclarationNode(id, params, body, generator, expression) {
	this.type = "FunctionDeclaration";
	this.id = id;
	this.params = params;
	this.body = body;
	this.generator = generator;
	this.expression = expression;
}

function VariableDeclarationNode(declarations, kind) {
	this.type = "VariableDeclaration";
	this.declarations = declarations;
	this.kind = kind;
}

function VariableDeclaratorNode(id, init) {
	this.type = "VariableDeclarator";
	this.id = id;
	this.init = init;
}

function ThisExpressionNode() {
	this.type = "ThisExpression";
}

function ArrayExpressionNode(elements) {
	this.type = "ArrayExpression";
	this.elements = elements;
}

function ObjectExpressionNode(properties) {
	this.type = "ObjectExpression";
	this.properties = properties;
}

function FunctionExpressionNode(id, params, body, generator, expression) {
	this.type = "FunctionExpression";
	this.id = id;
	this.params = params;
	this.body = body;
	this.generator = generator;
	this.expression = expression;
}

function SequenceExpressionNode(expressions) {
	this.type = "SequenceExpression";
	this.expressions = expressions;
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

function NewExpressionNode(callee, args) {
	this.type = "NewExpression";
	this.callee = callee;
	this.arguments = args;
}

function MemberExpressionNode(object, property, computed) {
	this.type = "MemberExpression";
	this.object = object;
	this.property = property;
	this.computed = computed;
}

function IdentifierNode(name) {
	this.type = "Identifier";
	this.name = name;
}

function LiteralNode(value) {
	this.type = "Literal";
	this.value = value;
}

function SourceLocation(source, start, end) {
	this.source = source;
	this.start = start;
	this.end = end;
}

function Position(line, column) {
	this.line = line;
	this.column = column;
}

/* Object and Array patterns are not part of the ECMAScript Standard
function ObjectPatternNode() {
	this.type = "ObjectPattern";
	this.properties = [];
}

function ArrayPatternNode() {
	this.type = "ArrayPattern";
	this.elements = [];
}
*/
/* End AST Node Constructors */

/* Expose the AST Node Constructors */
parser.ast = {};
parser.ast.ProgramNode = ProgramNode;
parser.ast.EmptyStatementNode = EmptyStatementNode;
parser.ast.BlockStatementNode = BlockStatementNode;
parser.ast.ExpressionStatementNode = ExpressionStatementNode;
parser.ast.IfStatementNode = IfStatementNode;
parser.ast.BreakStatementNode = BreakStatementNode;
parser.ast.ContinueStatementNode = ContinueStatementNode;
parser.ast.ReturnStatementNode = ReturnStatementNode;
parser.ast.ForStatementNode = ForStatementNode;
parser.ast.FunctionDeclarationNode = FunctionDeclarationNode;
parser.ast.VariableDeclarationNode = VariableDeclarationNode;
parser.ast.VariableDeclaratorNode = VariableDeclaratorNode;
parser.ast.ThisExpressionNode = ThisExpressionNode;
parser.ast.ArrayExpressionNode = ArrayExpressionNode;
parser.ast.ObjectExpressionNode = ObjectExpressionNode;
parser.ast.FunctionExpressionNode = FunctionExpressionNode;
parser.ast.SequenceExpressionNode = SequenceExpressionNode;
parser.ast.UnaryExpressionNode = UnaryExpressionNode;
parser.ast.BinaryExpressionNode = BinaryExpressionNode;
parser.ast.AssignmentExpressionNode = AssignmentExpressionNode;
parser.ast.UpdateExpressionNode = UpdateExpressionNode;
parser.ast.LogicalExpressionNode = LogicalExpressionNode;
parser.ast.ConditionalExpressionNode = ConditionalExpressionNode;
parser.ast.NewExpressionNode = NewExpressionNode;
parser.ast.IdentifierNode = IdentifierNode;
parser.ast.LiteralNode = LiteralNode;
