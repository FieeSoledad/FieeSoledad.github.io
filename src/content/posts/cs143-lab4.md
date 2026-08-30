---



title: cs-143-lab4分析与实现

description: cs-143-lab4实现过程中的思考与踩坑。

published: 2026-06-21

category: 编译器

tags: [编译器, Cpp]

---

## 先是文档阅读

```
handout阅读





1introduction

这里是语义分析

实现COOL语言的static semantics



静态语义分析器应该：

存在错误的程序，能够检测并拒绝

正确的程序，收集后续codegen阶段需要的信息

输出是一棵带有 类型标注 的AST



不止一种解决方案



需要查阅：

类型规则

标识符作用域规则

COOL语言中的其他约束









需要向AST类中添加新成员



高层次语义来看，任务是：

1 查看所有类并构建继承图

2 检查继承图是否合法

3 对于每个类

遍历AST，将所有可见声明收集到符号表中

检查每个表达式是否满足类型规则

为AST添加类型信息







2 files and directories

2.1 cpp version

cool-tree.h，AST组件自定义扩展

semant.cc，实现语义分析阶段的主要文件

包含预定义符号，表示继承图的ClassTable框架

语义分析器通过调用program_class类的semant方法启动

所有cool-tree.h的声明在这里实现

semant.h

good.cl和bad.cl





3 tree traversal

大多数的dump_with_types方法，展示了如何遍历AST并从中收集信息

为了完成所有检查工作，很可能至少需要遍历两遍AST







4 inheritance

继承基本要求继承图是无环的

基本类已经定义，要自行纳入继承体系



建议将语义分析分为2个阶段

1检查继承图是否良好定义

2检查其余所有的语义条件







5 naming and scoping

任何语义检查器重要组成部分是名称管理

symbol table是一种方便管理名称和作用域的结构

entering scope

exiting scope

augmenting scope，扩展作用域？



除了self，对象名称可以通过4种方式引入

属性定义

方法的形式参数

let表达式

case语句的分支



为什么这里又说类、方法不需要先声明后使用？



6 type checking

语义分析器的另一项功能是类型检查

根据语义规则验证每个表达式是否具有合法的类型





需要提供有信息量的错误信息



需要能从错误中恢复，也要避免级联错误





7 code generator interface

代码生成器接口



采用一个朴素的接口，避免限制了设计思路

每个表达式节点，必须有一个type字段设置为Symbol类型

特殊表达式no_expr必须赋予类型No_type，这是预定义的一个符号





8 expected output

期望输出

除了不合法的继承结构外，需要能够恢复

如果继承结构是合法的，应该捕获所有的语义错误





9 testing the semantic analyzer

简单的错误报告semant_error这个方法可以打印错误，接收一个Class_对象





10 remark

参考实现有1300多行左右的cpp注释代码

需要问自己以下问题：

需要检查哪些要求

在什么时候检某个要求

检查某个要求的信息是什么时候生成的

需要用来检查某个要求的信息在哪里？
```

## 开始理解starter code并实现语义检查

```
开始自己读代码理解

include里只是加了一个symtab.h，其他都是老东西了





ast-lex

ast-parse

是单纯的skeleton代码，不是直接生成的？

从控制台读取AST的文本表示形式





semant.cc

semant-parse

这两个重点阅读即可



semant-parse是语义分析阶段的测试驱动程序

主程序从标准输入读出文本形式的AST，对其进行解析，输出带有类型标注的AST

mysemant会包含lexer和parser的pipeline



semant.cc中的main函数会对抽象语法树的根节点ast-root调用semant方法



全局声明

arg，

arg2

Bool

concat

cool_abort

copy

Int

in_int

in_string

这些是Symbol类型

初始化：都加入idtable





Q：ClassTable的设计？

A:

成员

semant_errors，整型

error_stream，错误的输出通道

行为

install_basic_classes，无参

这是一个可包含语义信息，例如继承图之类的结构

各种方法的容器

构造方法：传递Classes这样的类型。

semant_error(symbol, tree_node)，第一个参数是filename





关于如何创建虚拟解析树来引用Cool的基础类，这里不需要方法体，因为已经包含在runtime system



Object类没有父类

封装行为包括：

abort，返回Object

type_name，返回string

copy，返回SELF_TYPE







Q：第一问，自己要检查哪些要求？

A：

第一个继承体系正确。

第二个类型正确

让我

语义分析需要检查什么？第一个类

首先呢

类型是类型，这是描述类定义时的静态语义

变脸是变量，变量只记录自己是什么类型即可。



类需要检查是否成为环，这个简单。



Q：class需要保证什么语义？

A：

第一个标识符不能重复。

第二个inherits后面跟着的TYPEID的类要有定义

第三个继承图不能成环



Q：feature需要保证什么语义？

A：

attr 一个中的attr的标识符不能重复定义。

attr 声明的类型要和赋值expr的类型一致

method 方法名不能重复

method 如果在父类中有定义，必须保证形参和返回参数都相同



Q：什么时候检查某个要求？

A：

先递归调用子节点的semant，收集玩子节点的类型信息检查再检查自己吧





Q：检查某个要求的信息是什么时候生成的？

A：

从递归子节点的信息推导而出父节点的类型信息



Q：检查某些要求的信息在哪里？

A：

当然在一个AST node里面就包全了





Q：再看看cool-tree组件的各种抽象

A：

有copy，返回tree_node

有copy_XXX，这个返回的是具体的

有dump

有dump_with_types

list_node等类型也实现了dump，也就是遍历容器内的elements调用其dump



expressions每个子类的dump基本都是调用的dump_Symbol

就算int_const和str_const那也是Symbol，只有一个bool_const是int类型



Q：怎么没看见cc文件中声明namespace呢？

A：



Q：继承图的数据结构设计？

A：

继承图是需要应该是要一直维护的，不应该放在栈上检查一遍就结束



判断图是否成环

只需要遍历

DFS检查是否成环，如果不成环确实能正常返回，但是如果成环了呢？



这里继承图是要抽象为有向图还是无向图？

当然是有向图

有向图和无向图的成环判断是？

A -> B

C -> B

无向图：维护访问过的节点，不过要注意是不是父节点

有向图：维护访问过的节点和在路径上的节点



判断成环很简单，收集所有节点，直到最后没有入度为0的节点。



以及如何处理类的重复定义的问题？

还有类的重复定义？



这个链表的设计也是太巧妙了，神作一样，还可以简单递归调用所谓的什么呢？



Q：我发现了一个很严重的问题，class__class的封装太底层了，上层抽象访问不到具体字段怎么办？

A：





Q：类定义的唯一标识符是什么？当然是类名字呀

A：

所以用Symbol是完全可以的





Q：Class_class这层抽象原本不必，但是因为要和Feature、Expression那种众多具体形式的定义对齐，aps就这么设计了

A：

如果是Feature那种子类字段不一样的话。应该怎么办呢？

只能强转了吗？

gpt说要将逻辑下沉得更多一点，check等逻辑都封装在子类，只提供一个get_type接口



Q：有没有什么情况，父类必须完整知道子类的结构来进行某种语义检查？

A：



确实所谓的方法等的语义检查应该带上符号表呀

所以先进行attr的检查？再进行method的检查？

attr收集符号。

类的继承图检查之类的

很麻烦呢

语义报错信息。





符号表需要在遍历整个AST期间进行透传吗？

符号表的DAT设置为Symbol是挺合适的

符号表是全局一个呢还是每个类创建一个呢。

每个类创建一个可能比较合适吧，这样未来也许可以并行加速

确实是这样的



Q：所以为什么SymbolTable的addid接口要设计为指针？

A：



Q：attr要进行什么语义检查？

A：

attr的标识符不能重复，不能是Self

也要检查类型是否存在，也可以是SELF_TYPE这样不存在的

如果有赋值，要检查expr的实际类型和type_decl是否一致





Q：method要进行什么类型检查？

A：

方法名不能重复

检查每个formal

检查返回类型





Q：formal需要检查什么？

A：

arg不能重复

检查formal声明的类型是否存在



Q：返回值需要检查什么？

A：

检查返回值声明的类型是否存



Q：





Q：是否有必要在class进行语义检查之前构建attr和method的信息汇总？

A：

attr主要就是标识符的类型信息，这个倒是简单

method有形参类型信息、返回值类型信息，需要在方法调用检查时候获取这些信息。



method_info

{

name

formal_entrys

return_type

}

这些全都需要做检查



Q：问题是这些有必要完全维护吗？知道一个类，检查全部的什么呢？方法信息？

A：

当然有必要，不然每次查找的复杂度太高了



Q：因为继承的关系，有许多检查都不太好做，应该是需要ClassTable提供公共的接口

A：

api1：给出subclass，收集所有父类的标识符，这个用于判重

api2：给出subclass，收集所有父类的属性信息，这个用于构建第一层作用域





Q：对类的类型检查是否需要从root节点开始？

A：

因为构建第一层的作用域，需要收集所有的祖先类的属性信息

如果不这样的话，确实是无法完成的



Q：我发现在每一层检查标识符是否重复还真是一个很高频的检查点呀

A：

确实是这样的



Q：所有的父类的属性可以不管来自第几层吗？

A：

应该是可以的，只有动态分派的时候可能需要知道method来自第几层



gpt说COOL的attr和method是独立的命名空间





重复定义怎么说呢？方法的语义检查。

重复声明



Q：检查方法名的时候，是方法内部自己检查还是什么呢

A：

这个当然是内部检查



Q：COOL中属性赋值表达式允许使用本类和父类的属性吗？

A：

允许的，完全没问题



Q：思考一下各种表达式的semant_check需要什么环境？

A：

classtable，表达式有可能是静态分派什么，肯定需要查找方法吧

clazz，有classtable这个就必须要有

symtab，这个必须要



Q：对了，条件表达式的类型应该如何定义呢？

A：

lub，最近的公共父类



Q：typ_case表达式的语句好复杂？

A：

case提供了对象的运行时类型检查

对expr0求值记录其动态类型？

看来运行时类型检查，还需要生成奇怪的代码呢？

策略1：利用class tag的连续性

策略2：运行时爬树



既然部分代码生成是运行时阶段，那么语义分析阶段进行静态语义检查的工作是什么呢？

答案就是检查每个expr的静态类型，然后找到最近的祖先吧。



Q：奇怪了，Case不是expression的子类

A：

原因是什么

就是这样啊



Q：我好像快将作用域检查的事情忘完了？

A：

符号表的接口也得用起来呀





Q：let表达式的语义检查应该检查什么？

A：

是否需要每嵌套一层就作用域呢？

这里是一个嵌套结构，是否需要每次新开倒是不必把？

作用域的规则是帮我们确定标识符究竟是谁，一个定义域内是不允许重复的吧？

不对，这里允许shallow





Q：接下来就是实现算术与比较表达式的语义检查

A：

=是一个特例，相等性仅检查指针的相等性，相等性对于void也是有定义的





Q：现在我似乎知道了为什么我迟迟用不上符号表中的查找标识符的方法了，那个是Object表达式一步确定的吧

A：

symtable的lookup和probe的区别是什么呢？

什么时候有可能用上lookup

什么时候有可能用上probe，有什么必要用在当前作用域，事实上不符号表的内容就是所有的了呀。

对了，原来可以用来去重吗？可以用于在检查类属性定义时去重，好像也就这一个作用，其他没了



Q：差不多该结束了

A：

现在是1100行左右的cpp代码，跟参考实现的1300行差不多





Q：剩下的工作是哪些？

A：

人类可读的报错信息

避免级联错误是很必要的

还有self相关的处理，特别是SELF_TYPE的处理需要考虑继承关系



现在的报错有什么类型





Q：寻找最近的公共父类有什么好的方法吗？

A：

还是得从根部开始dfs呀

有没有什么其他方法呢？

除非什么呢，树上倍增。

能不能一次dfs完成？有点困难





Q：所以接下来是报错信息，报错信息应该如何设计？

A：

semant_error，直接自增错误数量

semant_error，传递Class_

semant_error，filename，tree_node

看来可以打印行号，并且维护一个输出流对象的设计是挺不错的‘



Q：self相关处理是什么呢？

A：

self很好办，因为只有object这里用上了。

self只能出现在方法中。

类型声明全都可以是SELF_TYPE

类型匹配时不能直接用等于，需要考虑继承关系



Q：SELF_TYPE可以出现在哪里？

A：

返回类型

属性声明

let

new 等表达式

只允许出现在协变covariant的位置





Q：协变是什么概念？

A：

用来描述复合类型的继承关系是否与其内部元素保持一致的概念

如果Dog是Animal的子类，那么List<Dog>是否是List<Animal>的子类

返回值支持协变



Q：self相关的处理逻辑如何设计？

A：

这个比较简单

SELF_TYPE能在继承图中动手脚吗？

在类表中添加映射，SELF_TYPE->对应的class

is_type_existed没问题

其实呢，还是比较麻烦，特殊处理一下也好



有哪些地方需要检查这些？

formals，这里类型不能为SLEF_TYPE，和祖先类型相比呢？

返回类型是协变的，还有哪里需要考虑这个吗？

基本都需要，因为这是多态的来源

前提是将s所有SELF_TYPE替换为具体类



Q：这个错误输出的设计还不错，在获取错误输出工具的调用中就把一些公共逻辑给顺便执行了

A：

但是这也不太对，因为每次打印一行，就需要获取out，这显然不太对



Q：我这样在上层孜孜不倦地报错，会不会有重复？

A：

确实是会有的

所以我们来区分一些基本错误和高层语义错误吧



基本错误：

类型不存在

赋值表达式类型不匹配

标识符未定义

好像就只有这些呢？还是挺少的





Q：表达式类型推导错误应该是No_type还是Object类型好一点呢？

A：

暂且No_type吧，至少知道这是一个错误





Q：报错这里有个问题，

A：

那就是如何检查block_expr时不多余地进行报错？有可能是内部类型错误，也有可能是空



Q：哪些地方需要考虑新开作用域？

A：

检查class时

let表达式

block表达式，这里包含了block表达式吗？

检查body时候需要将形参加入符号表，也就是说。这个确实是一个问题。方法就是啊

block可不仅只用在方法中吧，应该可以随便开吧？不过没什么意义就是了。

block表达式没必要新开一层scope吧，因为COOL中声明新变量只在let表达式中

branch表达式中





Q：如果一个声明的类型并不存在，那么还有必要在符号表中维护他的类型吗？

A：

考虑这样有什么意义

应该是没有意义的

因为呢要在方法中凭空给一个变量绑定未定义的类型没什么问题

但问题是检查赋值时的类型兼容性检查依赖的是预先定义的继承图，而继承图中并没有这些未定义类型的信息



Q：No_type是无表达式还是什么的？

A：

只报错一次就好了吧，应该是的





终于撸到了PA4的最后阶段了。似乎还有SELF_TYPE这一块没有详尽检查？

哪里需要用到这个SELF_TYPE？

static_dispatch，需要这个

typcases的branch_class，需要这个

let binding相关，需要这个



还有就是前面可能存在一些多余的报错信息



好像还有attr的SELF_TYPE没检查



Q：assign赋值表达式和attr的区别是什么？

A：

区别是attr的赋值可以为空。

晚上再回来继续吧，准备做到的事情是什么？





Q：第一次编译有什么错误？

A：

头文件的循环依赖

我就说在semant里面是如何获得.cc文件里的定义的呢

还是需要extern

还有就是class_class中不小心声明为纯虚函数

static Symbol为什么要去掉static？因为static是内部链接，extern是外部链接

attr_class的getter没有实现





query_method没有一开始检查当前方法

semant_dfs忘记启动了

cur为No_type兼容任意类型就是扯淡

attr中的类型兼容判断写反了



我这里确实有点蠢了，那个所谓的SELF_TYPE除了基本只在兼容性检查需要转为具体类型，直接收束到is_ancestor方法中最省事



basic_type的方法是runtime system生成的，方法体都是no_expr，应该语义分析阶段跳过检查

赋值不应该向符号表添加变量，只需要检查类型兼容性问题。因为左边的标识符早就在let或者formals中定义了的





Q：现在语义分析器能完整运行了，还剩什么问题？

A：

形参个数太多太少没有检测出来

还有classes-level级的语义检查出现了级联错误

还有就是基本类信息没有提前构建









Q：明明有语义错误，为什么没有看见任何打印？

A：

我忘记了

Int、Bool、Str无法被继承

Object和IO是允许继承的





Q：AST上，所有的SELF_TYPE应该推导为具体的类吧？

A：

gpt讲不通

我觉得需要

object

new，这个需要控制

cond，这个不需要，只要各自表达式不推导出SELF_TYPE即可

typcase，这个不需要，下面多个case，也就是branch

branch，这个只需要保证表达式不推导出SELF_TYPE即可

dispatch，这个要重点控制

static_dispatch，这个也要重点控制





Q：保留疑问，我现在的AST能快速转为LLVM IR吗？

A：
```

## cpp相关

```
cpp tips：



Q：Symbol是一个对象的指针类型。为什么能用new Symbol这种语法？

A；

这种什么时候进行垃圾回收？



Q：const变量就能绑定一个右值

A：

因为确定不会往那块内存写入任何信息

大概就是这样的设计吧
```
