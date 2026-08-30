---



title: cs-143-lab2分析与实现

description: cs-143-lab2实现过程中的思考与踩坑。

published: 2026-06-11

category: 编译器

tags: [编译器, Cpp]

---

```
词法分析，手册7页



实现一个lexical analyzer，也就是scanner扫描器，并且使用一个词法分析器生成器来完成？

cpp工具为flex

java工具为jlex





Q：什么是flex？

A：

flex会将规则文件lexer.l编译成C代码，这些代码实现了一个有限自动机

flex规则文件为：

%{

Declarations

%}

Definitions

%%

rules

%%

User subroutines

其中声明部分和子程序部分都是可选的，optional。





Q：什么是rules部分？

A：

flex中的一条规则指定，当输入匹配规则开头给出的正则表达式或定义时，应该执行什么动作Action

如果输入能匹配多条规则，那么Flex会选择匹配字符数最多的那条规则

Action是什么内容

就是将内容记载到全局变量，返回TOKEN编码等等





本次的作业内容一部分是设计合适的测试输入







Q：什么是Scanner Result？

A：

需要编写Flex规则，能够匹配cool手册第10节和图1中的描述，定义合法token的正则表达式并执行相应的动作

例如

返回正确类型的TOKEN

在适当的时候记录词素lexeme的值

在遇到错误的时候报告

先阅读cool-manual第10节和图1，研究cool-parse.h中定义的token





Q：Scanner需要记录什么？

A：

例如，匹配到一个BOOL_CONST的token，需要记录真值

匹配到一个TYPEID token，需要记录类型名称



我的问题是这个不是语义层面的事吗？





所有错误需要传递给语法分析器，我的Scanner不应该输出任意内容。

忽略小写的error，由PA3使用





Q：词法分析阶段有什么错误报告与恢复要求？

A：

遇见非法字符时，仅将错误字符串返回

遇见未转义字符时，需要报告错误

字符串过长，报告错误

包含非法字符，报告错误

EOF仍未闭合是什么意思，

注释之外看见注释符号，也要报错





Q：什么是字符串表？

A：

为什么要将词素存储在一个字符串表中？

基本类标识符

检查整数字面量范围？





Q：字符串的识别需要作何处理？

A：

返回token，处理转义字符

返回\0是什么意思

扫描器需要维护变量curr_lineno，这是源代码行号，这个在语法分析器打印错误信息时有用

忽略token LET_STMT





Q：cpp版本的主要hints是什么？

A：

每次调用扫描器，都返回下一个token和词素

cool_yylex返回一个整数编码，表示语法类别



第二部分信息，语义值semantic value，存放于全局联合体cool_yylval



标识符的语义值是Symbol，存储于

cool_yylval.symbol

布尔常量，语义值存储于

cool_yylval.boolean

其余token不带有任何信息，除了error





Q：什么是字符串表？

A：

只需要知道表项的类型是Symbol







Q：阅读cool-manual第10节有什么收获？

A：

关键字是不区分大小写的



Q：cgen、parser、semant这3个二进制文件是做什么的？

A：

参考实现，用于构建端到端测试的





Q：PA2各个文件的作用？

A：

stringtab.cc是字符串表实现

mycoolc是脚本，将我的lexer和官方的后续阶段串起来，做到end-to-end的测试







Q：接下来需要学习flex以及scan阶段需要维护什么语义信息？

A：

词法单元有：

整数，Int_CONST

类型标识符，

对象标识符，

特殊符号，self，self_type，这个为什么要作为特殊符号？

字符串，STR_CONST

关键字，不区分大小写

空白符，空白字符



这些都不太知道

类型标识符和对象标识符有什么用吗？

类型标识符需要首字母大写，对象标识符需要首字母小写，







Q：flex怎么用？

A；

有个默认的yyin输入流，这里重新定义了YY_INPUT，这就是原因



Q：为什么能在lexical阶段保留semantic value？一个标识符是类还是什么，这个不是语义分析的的时候才能知道的吗？

A：





Q：奇怪，我这里根本没有用到yacc和bison呀？

A：

yacc实际是在幕后调用bison





Q：解析一下字符串表的设计吧？

A：

Entry

存储：

一个字符串的地址、长度和index（这个index不知道是什么）



Entry子类：

StringEntry

IdEntry

IntEntry



StringTable

成员

tbl，一个Elem的链表，

index，这个也暂时不知道是什么





IdTable

StrTable

IntTable这些是StringTable的模板特化而来



Symbol就是一个Entry的指针罢了



Q：这个ostream的重载我有点看不懂了

A：

就是一个全局的重载，我以前其实是知道的







Q：为什么没有逗号和分号这类词法单元？

A：

因为那种不需要在parse里声明，直接的ascii值就能做编码了







Q：YYSTYPE究竟是什么？

A：

每个token的附带值

Boolean

Symbol

Program

Class_

Classes

Feature

Features

Formal

Formals

Case

Cases

Expression

Expressions

char，一个错误信息





Q：接下来专注于flex文件的构造吧？

A：

cool_yylval，是YYSTYPE类型，只有一个

cook_yylex这个应该是函数名

MAX_STR_CONST，这是单个token的最长字符数

curr_lineno，行号

verbose_flag，这是打印开关？





Q：问题是语义值放在哪里不是以来AST的结构吗，为什么能在词法分析阶段做到这个？

A：

确实是这样，所以这里不会把值绑定到标识符





Q：如何识别错误？LET_STMT是做什么的？

A：



Q：这个链表的实现有点东西

A：

非常巧妙



Q：现在问题是如何在解析过程中维护语义信息？

A：

有三个表？但是symbol只有一个？

或者说idtable、strtable、inttable是在哪里实例化的？

好吧，就是在stringtab.h中实例化的





Q：遇见bool字面量怎么办？

A：

直接简单记录在cool_yylval中即可

因为idtable、strtable、intable也不是为了保留历史，而是为了快速比较相同对象









Q：详细介绍一下什么是flex中的start condition？

A：

这个可以理解为状态模式

%s 共享式启动

%x 独占式启动

这个让我们方便地定义mini-scanner



原来flex的官方文档里start condition中就有如何匹配字符串的内容呀



Q：string的要求是什么？

A：

为什么\\n代表的是真正的\n？

我有点奇怪了

reg中\n可以匹配一个换行符

但是要匹配\n这样的纯字符，确实是需要\\n，先转义一次反斜杠



Q：我一直不知道为什么不允许字符串中出现未转义的换行符？

A：

原来是因为为了避免忘记写"导致词法解析器吞掉后续代码导致无法解析。

这确实是个严重的问题诶。



想想这个string怎么写

最重要的就是处理转义的反斜杠和换行符

字符串中\n就代表了换行符

字符串中\o就代表o



想想comment需要怎么写？

(*开头

*)结尾

中间呢？

注释是可嵌套的



如果要匹配嵌套注释，是否需要维护一个全局状态？







Q：为什么双引号在匹配时需要转义？

A：

因为flex规则中，双引导代表让引号内的表达式失效



Q：为什么有的规则有返回，有的规则没有返回？

A：





string中的转义符？

\t，这就是一个制表符

\\t，遇见这个呢？怎么匹配？

两个连续的反斜杠代表着一个真正的斜杠



Q：行号如何维护？

A：

comment中直接++

string中遇见\+换行符++

普通代码中遇见\n就++



Q：self和SELF_TYPE不属于关键字，属于特殊字符

A：

毕竟这两个确实代表了OBJECTID和TYPEID，返回的是对象标识符和类型标识符





Q：scanner只能一次扫描一个文件吗？

A：

应该不是的



Q：扫描如何结束？

A：

处于INITIAL状态下遇见EOF符号



Q：我现在根本没有空白字符兜底，这个是怎么回事？

A：

可能单纯是因为parse读取的时候会跳过空白字符





Q：我可能还剩下什么bug？

A：

整数格式

嵌套注释，激活comment状态的时候没有处理嵌套

注释结束后的嵌套复位

处理未匹配的*)

缺少@和~

缺少兜底，未知字符

字符串错误处理不完整，null character和长度问题

错误信息规范



Q：被要求普通状态下的*)，需要报错，可是这个难道不是语义分析阶段做的事吗？

A：



Q：为什么string constant要求不能包含\0？

A；



Q：flex中规则顺序代表优先级吗？

A：

好像是的
```
