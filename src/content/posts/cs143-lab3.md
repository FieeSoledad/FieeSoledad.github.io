---



title: cs-143-lab3分析与实现

description: cs-143-lab3实现过程中的思考与踩坑。

published: 2026-06-17

category: 编译器

tags: [编译器, Cpp]

---

```
语法分析，4页

LR文法



语法分析器生成器

cpp使用bison

java使用cup

输出为抽象语法树





利用语义动作semantic actions来构造这个AST



需要修改的文件如下：

cool.y，包含一个cool语法解析器描述的初始框架

声明部分基本完成，但是对引入的新的非终结符，需要添加额外的type declarations

可能需要添加运算符优先级声明

good.cl，覆盖语法中尽可能多的合法构造legal constructions

bad.cl，能在单个文件中覆盖尽可能多种类型的语法错误，parsing errors

readme，在文档中说明设计决策、测试用例，以及为什么你的程序是正确的





3测试语法分析器

可以使用自己的和cool提供的

myparser是一个脚本，将语法分析器和scanner粘合在一起运行

bison和CUP会在cool.output中生成人类可读的LALR(1)分析表转储



4语法分析器输出

语义动作应该构建一个AST

AST的根节点必须是program

结果得是AST的打印

错误函数，由bison自己调用

无需考虑编译多个文件的情况



5错误处理

使用error伪终结符，为语法分析器增加错误处理的能力

至少能在以下情况下恢复：

类定义存在错误，下一个类语法正确，能从下一个类继续

feature的错误，分析下一个feature

let binding错误，从下一个继续

block中表达式错误，从下一个继续



不需要太担心行号



6 语法树软件包

需要cool-tour中的大部分信息



7 remarks

优先级声明，不能仅仅依靠这个消除shift-reduce conflict

let结构会引入二义性，定义为尽可能向右延伸





8 cpp说明

必须为带有属性的终结符和非终结符声明bison的types



yacc是贝尔实验室开发的语法解析器，非常经典，因此许多后续项目保留其API

为了替代商用的yacc，GNU开发了bison

cool.y结构和cool.flex十分相似









-----------------------------------------------------------------------



Q：cool.y的外部依赖是什么？

A：

cool-tree.h，这个是根据aps文件生成的，stanford自行开发的描述AST的语言，一种DSL

stringtab.h，字符串表



Q；告诉我什么是APS？

A；

Abstract Programming System

stanford当年开发的一套工具

目标是用一种声明式语言描述AST

自动生成：

AST节点类

构造函数

访问接口

dump函数

列表类





aps文件长什么样？



phylum是什么？AST节点的类别

Program、Class_、Feature、Formal、Expression

生成后杀死Program_class这样的东西



Q：constructor是什么？

A：

某一种具体的AST节点

比如let和plus之类的







Q：AST组件的代码结构是什么？

aps生成cool-tree.cc、cool-tree.h

cool-tree.cc包含cool-tree.h，tree.h，cool-tree.handcode.h

cool-tree.h也包含tree.h





Q：cool-tree.h中有什么定义

类型的定义和constructor的定义



tree_node的设计

成员

line_number

行为

copy

dump

获取行号



Program_class的设计

继承了tree_node

行为上重写了copy方法



program_class的设计

成员

Classes

行为

构造方法

copydump

这里知道了一些宏定义扩展的原理了





Class__class的设计

继承了tree_node



class_class的设计

成员

name，Symple类型

parent，Symple类型

Features，Features类型，也就是类的成员方法

filename，为什么需要这个成员？

行为

构造方法

copy

dump



Expression_class的设计

Expression只是Expression_class的指针

什么才能算作Expression？COOL是函数式编程语言，按理说一切都是表达式，表达式都有值

继承tree_node





Case_class的设计

case只是Case_class的指针类型

继承tree_node



branch_class的设计

继承Case_class

name，Symbol

type_decl，Symbol

expr，Expression





assign_class的设计

继承Expression_class

name，symbol

expr，Expression



static_dispatch_class

dispatch_class

cond_class

loop_class

typecase_class，为什么这个又继承的是Expression_class

block_class

let_class

plus_class

sub_class

mul_class

divide_class

neg_class

lt_class

eq_class

leq_class

comp_class

int_const_class

bool_const_class

string_const_class

new_class

isvoid_class

no_expr_class

object_class



这里phyla和constructor似乎没有明显的边界

构造一个constructor的方法已经封入了类的构造方法，但是后面还是封装了一层new class的方法









Q：tree.h中有什么设计，有包含constructor的内容吗？

似乎没有包含constructor的内容

还有自己实现的类似数组的结构



list_node的设计？

继承了tree_node

行为

copy

nth

first

next

more

copy_list

len

nth_length

nil，这个是做什么的？

single，这个是做什么的

append，这个是做什么的



nil_node的设计？

继承了list_node

成员

什么也没有

行为



single_list_node的设计，表示单个元素的节点



append_node，这个我确实不知道是做什么的呢









Q：我现在在做语义分析，应该是要用上LALR语法，再构建AST的

但是现在为什么我没有看见任何写文法、求FOLLOW集的地方？

A：

虽然FOLLOW集能bison生成代码自动求吧，但是难道我文法都不用写吗？

自动求FIRST、FOLLOW集

构造LR0集

生成ACTION/GOTO表

生成yyparse之类的工作







Q：典型的bison文件是什么结构？

A：

%{

cpp代码

}%

definitions

%%

grammar rules

%%

user cpp code







Q：definitions部分的语法规则

A：

%union 存放所有token和非终结符的语义值

%token 声明终结符

%token <symbol> token，声明的带类型的token

%type <expression> expression，产生式规约后，属于union.expression

优先级声明

%right

%left



Q：rules部分的语法？

A：

这里是真正的CFG，context-free grammar

program : class_list

$$等的详细用法可以看bison文档的semantic actions

$$代表着归约出的左边的值

$1代表着产生式右边第一个的AST

$2代表产生式右边第二个的AST

ascii字符可以直接使用





Q：解析一下append_node的设计呢？

A：

不断拼接，这样时间复杂度低



Q：什么时候需要维护位置信息呢？

A：

其实这里YYLLOC_DEFAULT已经自动维护了AST节点的位置信息？





Q：Class_class这个层级的抽象有什么必要？

A：



Q：为AST节点维护filename有什么意义？

A：

方便提示报错信息



Q：为什么方法和属性能用一个feature进行抽象？

A；

其实不是

method_class是Feature_class的子类

attr_class是Feature_class的子类



method_class的设计？

name，Symbol类型

formals，Formals类型

return_type，Symbol类型

expr，Expression类型，这个应该是方法体



attr_class的设计

name，Symbol

type_decl，Symbol类型

init，Expr类型，赋除值吧



Q；所以说方法名是属于OBJECTID吗？

A；

是的



Q：如果方法体为空怎么办？

A：

直接就是劝退的，明明白白，你直接去调查一下有多少人大二了都不会用git的？





Q：现在问题是Formal之间的, class之间的分号终结符怎么匹配呢？

A：

还有就是有的地方为空，用dummy_list站位是不是太麻烦了？



剩下的问题下午来解决吧，暂时就这样？

class_list的分号能直接匹配

feature_list的分号也能在单个feature的产生式后匹配

但是formal不行，因为最后一个formal后面是没有的，所以这个逗号需要formal_list来匹配



Q：block括起来的是一个表达式吗？

A：

是一个，constructor是有提供block这个方法的

但是这样的话，expression_list有什么作用呢》

这样的话，似乎expression_list就是在block中有了



这样的话，让我想想，let 后面跟什么？

let expr, expr, expr，binding_expr_list



Q：确实得好好思考一下expression应该如何定义

A：

这里只有算术运算

+

-

*

/

嵌套 {}  

binding这样的

new 初始化变量

expression : OBJECTID <

不不不，let也是一种expr

这么说COOL可以说存在一种思想：一切皆表达式？



Q：为什么expression可以为no_expr？

A：

这么说是支持空方法体的吗？



Q：COOL的静态和动态分配有符号吗？

A：

静态分派语法：

obj@Type.f(a,b



似乎expressions只出现在dispatch和static_dispatch表达式以及block中

block我理解，但是dispatch和static_dispatch



static_dispatch_class的设计

expr，Expression类型，所以允许匿名对象调用方法？

type_name，Symbol类型，类型名

name，Symbol类型，这个是方法名

actual，Expressions类型，对了方法的实参可以是表达式呀



dispatch_class的设计

expr，Expression类型

name，Symbol类型

actual，Expressions类型





Q：还剩最后一个问题，expressions在block中需要最后一个，在方法传参中只是中间有逗号，

看来得用两个不同的非终结符

A：

确实应该是这样的





Q：现在的问题是表达式后面可能是分号和逗号，如何区分？

A：

硬写逗号和分号吗？



Q：感觉直接使用expression代表这么多表达式有点太笼统了

A：

比如loop_expr是不能进行静态分配的

可能需要多加一些非终结符，如果要在语法分析阶段解决的话

gpt的意思是说这个可以留到语义分析阶段解决





Q：所以符号匹配还是得不同的表达式列表

A：

因为不同position的exprs的分隔符是不一样的



Q：所有的非终结符都需要类型声明吗？

A

应该是的，不然无从构建语法树。



Q：当前let_class内部成员只有一个标识符，这个如何处理？

A：

identifier，Symbol，

type_decl，Symbol，

init，Expression，

body，Expression，这个可以作为作用域



文档里确实有说let比较特殊，只允许一个标识符，如果遇见包含多个标识符，需将其转为仅包含单个标识符的嵌套let表达式

核心大招：right-recursive



为什么是右递归？

以为in body等特殊结构只能在最右边展开。



只是这里就需要新增一个非终结符let_bindings了



但是这里需要确定一下，这里生成的AST结构确实是嵌套结构，不是那种有同一level有多个binding_expr的形式。



Q：到了expression的产生式才找到有语义值的非终结符，这些语义值如何维护在AST中？

A：





Q：关于bison是如何获取某些终结符的semantic value的，还是得再次明确一下lexer吐出的是什么？

A：

gpt说lexer和parser是共享yylval的定义的



Q：定义完expression的产生式和语义动作

A：

接下来的工作是

定义

actual_params_exprs

case_list

block_exprs，这个还是直接以expression_list替代吧

let_bindings

等等非终结符



但是这样的话expression_list这个非终结符似乎永远用不上了，不对呢，block_exprs还是能用的，这是最纯正的expr;匹配应用





Q：我总共自定义了哪些非终结符，如何为其定义类型？

A：

actual_params_exprs，这个类型是Expressions没问题

let_bindings，这个嘛let_class？



这里还有一条非常重要的隐含：let_class、int_const等类型全都是expression的子类







nil_Cases这种是数据结构能力，APS自动生成，实际上确实没用





Q：准备通过make parser构建分析器，是否遇见什么错误？

A：

第一个错误是append的第2个参数居然是复数类型







Q：parser构建完毕，接下来就是验证了

A：

一下就被()包起来的expr打败了，原来是我没处理括号





Q：什么时候parser会报错？

A；

当look ahead没有任何匹配时，打印错误

或者说lexer吐出ERROR的token时，也打印错误



Q：bison如何设定优先级？

A：

比如1+3*9，如何保证正确解析？

写越下面，优先级越高

%left 左结合的声明，代表着reduce优先



产生式的优先级确定：最右边的终结符决定优先级

严格来说，优先级只是给终结符声明的。



接下来讨论优先级和错误处理的事情吧







Q：优先级声明虽然能简单解决这个 + 和 * 的解析问题，但是一条产生式直接以最右边的终结符确定优先级显然不太灵活

A：

有什么复杂的优先级问题吗？

工业界很多是用recursive descent手搓parse

bison这种遇见冲突默认移进





recursive descent的优势：

错误信息质量

复杂上下文判断

清晰的控制流







Q：目前parser有什么问题？

A：

还有一个问题，dispatch现在似乎没有包含调用隐藏的父类方法的产生式

cond没有消费FI

attr没有考虑不赋值的情况

报告了101的移进/归约冲突

允许(, x:Int)这样的形参声明和实参传递

没有错误恢复规则



Q：错误恢复规则如何实现？

A：

产生式左边只能是非终结符呀

有内置的error终结符

这个错误恢复不仅仅是ERROR非终结符，还有LR分析时遇见的无法分析的错误

这个LR分析错误恢复确实比较麻烦





Q：let的定义导致了二义性问题，如何解决？

A：

尽力将expr向右延伸，目前因为bison默认shift刚好匹配

硬核解决：

%left，尽量reduce

%right，尽量shift

%prec token，强制指定production的优先级

暂时明白了就好
```

bison相关

```
通用的bison语法
%{
cpp代码
}%
definitions
%%
grammar rules
%%
user cpp code

$$等的详细用法可以看bison文档的semantic actions
$$代表着归约出的左边的值
$1代表着产生式右边第一个的AST
$2代表产生式右边第二个的AST
ascii字符可以直接使用

%union 存放所有token和非终结符的语义值
%token 声明终结符
%token <symbol> token，声明的带类型的token
%type <expression> expression，产生式规约后，类型是union.expression
优先级声明
%right
%left
```
