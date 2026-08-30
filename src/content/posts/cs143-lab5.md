---



title: cs-143-lab5分析与实现

description: cs-143-lab5实现过程中的思考与踩坑。

published: 2026-06-29

category: 编译器

tags: [编译器, Cpp]

---

## 先是文档阅读

```
代码生成code generator



1introduction

所有错误的程序都已经在编译器前端阶段被检测出来，因此这里无需考虑错误恢复

本次作业的代码量大概是前一个的2倍，不过许多基础设施是共用的





Q：实现一个正确的代码生成器，关键在于什么？

A：

1COOL语言各种构造的预期行为

2运行时系统runtime system和生成代码之间的接口







2files and directories

2.1 cpp version



可能需要修改的文件

cgen.cc

入口函数是progran_class::cgen

在AST的root节点上被调用

提供了：



cgen.h

代码生成器的头文件





emit.h

包含各种代码生成宏，主要用于输出MIPS指令等内容



cool-tree.h



cgen_supp.cc

包含通用辅助代码











3 design

从高层次看来，需要完成任务：

1确定并生成全局常量的代码，比如原型对象

2确定并生成全局表的代码，比如

class_nametab

class_objtab，所以这个是什么？

dispatch tables

3确定并生成每个类初始化方法的代码

4确定并生成每个方法定义的代码





3.1运行时错误

6种会终止程序的错误

生成的代码应该能捕获前三种：

对void进行dispatch，对void进行case，以及分支缺失

并在终止前打印合适的信息

允许SPIM来捕获除0错误

最后两种错误，subtring越界和堆溢出，由于trap.handler中的runtime system负责处理



3.2垃圾回收

骨架代码中包含一些函数，cpp版本是code_select_gc

-g

-t

-T









4 testing and debugging

spim之类的东西

通过mycoolc运行我的编译器

Coolaid

xpim和spim都是MIPS模拟器

xspim提供许多额外功能

warning：spim是一个汇编代码解释器，而不是真正的汇编器，可是这有什么区别吗？
```

## 阅读starter code并实现代码生成

```
这里不是生成IR的

Q：为什么这里说dispatch on void等错误是运行时错误？

A：

因为确实是运行时错误，虽然COOL没有void关键字，但是还是有为空的对象的，比如未赋值的变量





先看代码

cgen.cc，几乎包含了生成器的所有代码

emit.h，各种代码生成宏

cgen_supp.cc，通用的辅助代码





Q：cgen.h中有什么定义和设计？

A：



CgenClassTable的设计？

继承符号表，只不过数据信息替换为CgenNode

封装成员

nodes，CgenNode链表

ostream

stringclasstag

intclasstag

boolclasstag，这些应该是类对象的头部标识符

封装行为

code_global_data

code_global_text

code_bools

code_select_gc

code_constants

继承图相关

install_basic_classes

install_class

install_classes

build_inheritance_tree

set_relations

constructor

code

root





CgenNode

继承class__class

封装成员

parentnd

children，这是一个列表

basic_status，这是一个枚举

封装行为

constructor，传递的有一个类表指针

add_child

get_children

set_parentnd

get_parentnd

basic，判断是否是build-in code



BoolConst

封装成员

val

封装行为

code_def，这个是做什么的，definition

code_ref，









Q：cgen.cc中的skeleton代码有什么提示？

A：

类表初始化器中为basic class设置tag

为虚函数表dispatch tables的标签添加到

IntEntry::code_def，同理包括StringEntry，BoolConst的code_def中，这个不知道什么意思

CgenClassTable中编写代码以emit所需的其他内容



new SELF_TYPE会生成特殊的代码

self的引用汇编代码也要不同？

原来之前在语义检查阶段让我保留SELF_TYPE，是为了避免dispatch tables中条目冗余吗？

不对，没有这个必要呀，跟那个没什么关系？先搁置吧

预定义符号





program_class::cgen接收一个emit汇编代码的输出流





Q：emit辅助过程是什么？

A：

emit_X负责将X对应的汇编代码写入到输出流中

同时存在一些emit_函数，负责根据命名规范生成各种标识符的名称？

以及生成一些对陷阱处理程序trap handler中定义底层支持函数的调用指令

寄存器名称和地址均以字符串的形式传递





Q：编写字符串、整数和布尔值的代码生成

A：

COOL包含三种常量，字符串strings，整数以及布尔值

这里定义每种类型的代码生成逻辑



这里有字符串常量表，类型为StringEntry，既作为字符串常量的定义，也用作引用

整数常量放在全局的inttable中，类型为IntEntry，用作常量的定义和引用

布尔常量只有2个





Q：CgenClassTable的code_global_data设计？

A：

emit 汇编代码以开启全局数据段







Q：emit.h中有什么设计？

A；

最大整数

字长为4

LOG_WORD_SIZE为2不知道是为什么



一些global名字

class_nameTab

class_objTab

_int_tag

_bool_tag

_string_tag

heap_start



_dispatchTab

method_sep

_protObj，这个是prototype obj，原型对象的意思

int_const

0, empty slot

label :\n，这是什么意思

STRINGNAME，String字符串的地址

MAINNAME

default_obj_fields，3

tag_offset 0

size_offset 1

dispatchtab_offset 2



GLOBAL

ALIGN

WORD



寄存器的名字

$zero

$a0、a1、t1、t2、t3、sp、fp、ra

操作码

jalr

jal

jr

sw

lw

li

la

move

neg

add

addi

addu

addiu

div

mul

sub

sll

beqz

b

beq

bne

ble

blt

bgt



Q：我是不是得先了解一下MIPS汇编的结构呢？

A：

一个典型的MIPS汇编结构：

.data

str_const0:

.text

.global main

main:



Q：main中需要什么结构？

A：

如何发射dispatchtab？

函数块是得拆分的

剩下的明天看看吧





Q：如何认识COOL的运行时系统？

A：

运行时系统包含的4类程序：

1启动代码，负责调用主程序的main方法

2build-in类的代码，Object、IO和String的方法实现

3捕获运行时错误

4垃圾回收器



在基础类对象之间的等价性比较中会使用类标签classtag

同时在异常中止函数中，也会利用类标签作为索引来查找包含每个类名的表格

原型对象必须由代码生成器直接编写在静态数据区

方法调用指针从未被runtime system直接使用



原型对象prototype object

在堆中分配一个新对象的唯一方法是使用copy方法。

每个可以被复制的类都必须存放一个与之对应的对象



栈与寄存器约定

运行时系统的原生方法期望参数存在于a0以及栈中

通常a0是self对象，额外的参数放在栈顶



运行时系统可能修改任何的暂存指针而无需恢复

heap pointer用于追踪堆上下一个空闲字，gp

Limit pointer，s7，用于追踪堆在何处结束







Q：expected labels是什么呢？

A：

运行时系统会引用某些固定标签。





Q：execution startup会发生什么？

A：

在启动过程中，会发生的事情：



1在堆上创建Main原型对象的一个全新副本

然后通过Main_init初始化

代码生成器需要执行Main的所有父类的初始化代码，并最终执行Main自身属性的初始化

2控制权转移到Main.main方法，将a0传入指向这个新创建的Main对象的指针，此时寄存器ra则包含返回地址

3控制权从Main.main中返回，程序执行将会停止，输出提示COOL。







Q：code_def和code_ref是什么区别？

A：

一个是definition

一个是reference











Q：为什么COOL中对象头没有垃圾分类标识符？

A：

方便未来扩展，说的是现代编译器经常这么干，gc信息不是对象信息的一部分





Q：为什么a0是作为arg1？一个对象方法被调用时，如何通过self索引属性？

A：

按属性偏移量索引即可。







Q：dispatch_table如何设计？

A：

所有方法都放入吗？

究竟有没有运行时爬树的内容？

肯定有的

我的AST type虽然将所谓的对象用作声明时对象，但是这好像是不对的？

dispatch_table只放当前类吗？那继承关系如何维护？

只要保证new时对象的tag是正确的即可



那么现在问题是如何运行时爬树？

要维护所有的继承关系吗？每个类的父类所在

然后遇见new SELF_TYPE的话，就用当前a0中的tag即可



不对，这样真不对吧？运行时爬树可不好爬呀，虽然能爬到祖先类，但是有没有对应方法还是难找呀

难道说dispatch_table需要做文章？比如说方法features。需要如何跳转真是不知道呢。

给一条继承链上的方法要给唯一编号吗？

继承方法和重写的方法？

完整继承：那就用父类的方法编号

子类重写：那就用子类的方法。







Q：看来我还真是个傻逼，dispatch_table就是要保留所有的方法，vtables，这样空间换时间

A：

我之前为什么会认为dispatch要保留就得保留所有的方法体呢？直接跳转到对应label不就好了吗？

这么看语义分析阶段确实要保留SELF_TYPE，这样才可能实现只为一个方法生成一份代码











Q：StringEntry中的index有什么用？

A：

便于在遍历完AST的时候收集String在数据区安排位置







Q：运行时代码提供的Object.copy是哪里提供的？

A：

trap.handler中提供的

object_size的单位是word，实际字节占用需要*4

调用_MemMgr_Alloc分配内存







Q：现在没有操作系统诶，所以为什么需要kdata和ktext这类命名？

A：

确实是没有用户态和内核态的区别

这样命名大概是因为惯例





Q：int_tag以及string_tag有什么必要全局声明，而不是写在原型对象的对象头上？

A：

equality_test

要比较相等为什么不直接比较呢？

因为COOL的语义是基本类型需要比较内容，非基本类型比较地址即可。

不知道Java是不是也是这样





String对象，val，str_field等

prim_slot是什么？原始机器值。





Q；dispatch on void的处理为什么是runtime system提供呢？

A：

运行时错误不是我来捕获吗？

难道我生成汇编代码需要依赖trap.handler中的函数符号？



Q：MemAlloc为什么还有快速路径和慢速路径？

A：

慢速路径需要检查是否需要GC

快速路径只需要简单移动堆指针即可



Q：所以class_Init需要什么工作我也知道了？

A：

大概就是表达式的求值罢了



li，load immediate，加载立即数

syscall被修改为异常打印，类似与risc-v中的ecall吧





Q：所以out_string这类方法需要和控制台输出设备交互的syscall是如何实现的？

A：

bin/i686/spim

这个MIPS模拟器就是这样，为James Larus所开发

4号系统调用









Q：讨论什么时栈机器生成？

A：

简单，就是将值保留在acc也就是a0寄存器中



Q：PA5的cool-tree需要依赖PA4吗？

A：

不对，好像还真不需要呢

只依赖type，PA4已经推导输出了带type的AST，这里不需要再调用一遍semant



Q：data和text要并行生成吗？





Q：static_data_area应该生成什么内容？

A：

所有的Int、String等常量

类名表class_nameTab，abort时需要打印

所有原型对象，通过拷贝进行对象的初始化

所有的dispatch_table



所以class_objTab是什么？



tag相关常量

GC相关常量



Q：我确实有点蠢了，直接看之前生成的stack.s文件不就行了

A：

所以这些labelnum究竟是什么

为什么只有A2I.xx一个方法有引用这些label？

并不是，其实大多方法都有的



Q：为什么stack.s中的str_const的编号是倒着写的？

A：

因为list的从前往后遍历吗？

确实是这样



Q：什么时候需要用到.algn？

A：

4字节对齐，分配对象时



Q：为什么string_const前面需要一个-1？

A：

答案是string_const就是一个String对象？

Int

String

常量暂且放一遍，如果是在栈上的一个String变量，那他的str_field就应该是指向堆上



原来如此呀

因为这里是汇编，所以写常量区代码时候，Int也是直接输出自己的str即可



Q：现在再来看CgenClassTable的设计

A：

封装成员

nds，为什么要维护这个？

str

xxtags



封装

code_global_data

为什么这里Main、String和Int的原型对象标识符需要单独标出来？

tag和bool_const我还能理解

label就是冒号加换行符

简单说就是.data的开头





code_global_text

给出Main_init和Int_init以及Main.main等方法的标识符声明



code_bools



code_select_gc



code_constants

调用StrTable和IntTable的code_string_table打印全部的常量

然后调用code_bools



构造方法的设计？

进入新的作用域

install_basic_classes，内部调用install_class安装基本类

install_classes，内部调用install_class

build_inheritance_tree，

code：依次调用data、gc、constants以及text进行代码生成





然后就是这个类表继承的是符号表，DATA类型是CgenNode，也就是class_class

引入了类型No_class，

引入了类型prim_slot，

它们的父类都是No_class，文件名为basic_class



Q：看看CgenNode的设计？

A：

parentnd，原本只有parent，是Symbol，现在直接有了其指针

children，子类

basic_status，是否是基本类

class__class根本没有单个参数的构造方法呀？原来是默认生成的拷贝构造方法





Q；这个classtable只有一个作用域诶？

A：

其实这个符号表的作用更类似哈希表吧



接下来就是AST和classtable的接口如何对齐了？









constant_id

gc_id

constants

protoObj

nameTab，这个只需要编号

objTab，这个是什么，其实先来一层nameTab索引也能替代这个的功能，记录原型对象和init函数的索引

dispatch_table，这个需要记录不断记录父类所有方法。就是这样的

text，这个是方法代码生成



Q：为什么需要在list.h中实现新的链表？

A：

这个是轻量级的链表实现，tree.h中的是ast_node，需要支持打印





Q：ast-parse是读文本构建AST的？

A：

利用xxx_class的构造方法即可。





Q：在获取AST的过程中有维护stringtable吗？

A：

string常量包括什么？

或者说data区需要保留的常量是哪些？

字符串字面量，类名，其他都不需要，所以stringtable只需要保留这些即可

<basic_class>为什么也保留？

不太清楚呢



为什么string这么自信，code_def会生成一整个对象呢？

code_ref



还有为什么Object_protObj等不需要生成引用？其实可以呀。





Q：整体思路总结？

A:

第一次dfs，构建dispatch_table，这个其实不难



第二次dfs，构建所有protObj

这个其实比较麻烦，因为不是所有attr都是Int和String这种基本类型

所以如何构建对象的大小呢？

原型对象的大小，如果存在循环引用怎么办呀？



Q：什么是SpringBoot中的循环引用

A：





还有这个String对象的大小问题

String <- "hello"，String是在栈上分配还是堆上分配呀。





这两个dfs主要利用的就是class-level这个层面的信息





第三次dfs，cgen，会利用到所有类型的AST node信息







Q：所以prim_slot是什么设计？

A：

原始插槽，在这里什么也不是，不是类

可以避免无限引用



Q：所以String是分配在堆上还是栈上？

A：

肯定是堆上

这一方面我以前确实是有认知上的误区呢







Q：所有对象都分配在堆上，栈上只保留对象的引用是吗？

A：

Java其实也大概是这样设计

堆上对象的重要特性是，堆上对象不会随着栈帧的销毁而失效





Q：这么说来，大多对象的大小都是固定的，只有String这种对象的大小不固定？

A：

处理起来也不麻烦，只需要保留其引用即可

链表长度编号？





Q：关于生成dispatch_table的这个需求，我应该数据结构合适？

A：

需求是

1如果子类重写了，O(1)时间复杂度查询这个方法标签应该写在vtable的哪个槽位。

2遍历完子类后vtable要能完全恢复遍历之前的状态。

3还需要方便按槽位索引进行遍历



我的想法是维护一个vector<Symbol>存放class.method_name，dfs时用拷贝语义

维护一个mapper，维护Symbol->slot的映射。dfs传参时也用拷贝语义？





Q：关于生成所有的proto_obj，应该如何实现？

A：

挺简单的，如果是对象就全都只存储一个引用即可





Q：对于build-in类的原型对象应该如何构造呢？

A：

我记得所有classtag我在生成nameTab的时候就已经分配了。

为什么classtable设计为符号表？

大概是因为能直接从name获取具体的class_对象？但是我是dfs遍历，没有这个需求？

剩下的问题是什么呢？

基本类的protObj需要我构建。

如果是Int和String，应该是要特殊处理一下





Q：如何输出一个整数？

A；

直接输出即可，我源码里写的就是字符串





Q：为什么要事先决定bool、string和bool的classtag?

A：

答案是常量对象需要分配

那么能不能先分配了nametab和proto再进行constant的分配



现在的问题是为什么类名也要作为String对象保存？

原因当然是因为abort需要打印。需要支持按tag索引。







Q：在void上的创建？

A：

init中初始化时如果没有初值就将tag设置为-1如何？

String，有时候需要判断是否是basic类







Q：我看参考实现编译结果是所有类的init挤在一坨，但是实际上有必要这样吗？

A：

似乎没有必要，而且这样很不自然，可以一次dfs



Q：我大概知道ClassTable设计为符号表的用意了

A：

可能是为了在new的时候根据类型找到classtag





Q：Int和String以及Bool的tag有什么必要手工分配？

A：

gpt说是没有必要，这里提前分配只是方便阅读







Q：Object.copy方法是如何被runtime调用的？

A：

传入一个a0，指向原型对象

方法内部先保存ra和a0

返回时a0是分配对象的地址



此时调用Main.init方法

空出三格，保存

fp，函数栈指针

s0，为什么只保留这个，可能是因为只覆盖这个

ra，返回地址



为什么fp设置为结束地址？



Q：fp究竟有什么用？

A

fp是固定的，这样可以用来寻参





Q：init函数的设计原则是什么？

A：

递归调用父类的init方法吧大概是的





Q：为什么init的递归调用中，总是将a0保存在s0中，然后从s0中恢复？用压栈操作不好吗？

A：

因为self必须随时维护



Q：如果一个对象是空的？属性应该如何复制呢？

A：

地址直接设置为0吗？

也就是所谓的



方法开始的时候固定fp



似乎上一个函数的上下文不属于任意栈帧

fp也是callee保存





Q：cs143课件上的calling convention似乎和PA5中skeleton代码有点不一样?

A：

gpt也承认了这点





Q：接下来有新的问题了，那就是各个生成方法隔离的expr如何协同利用寄存器？

A：

比如这个let 什么的，我得知道是哪个参数吧？

难道还要维护当前作用域中每个参数的地址？

方法中的变量有挺多种

一种是对象的属性，这个由self+offset访问

一种是实参

一种是声明的局部变量



构建全局原型对象的时候就设置了attr的偏移

当然，原型对象是不依赖这个的，但是生成init方法有这个依赖





callee保存了

fp

s0

ra



只能说这个convention的课件和代码实在没对齐



Q：dispatch相关表达式要如何进行cgen？

A：

call调用之后

默认

fp

s0

ra都是上一层函数相关变量

所以调用之前呢？



函数执行过程中，要求s0是当前对象



如果在方法体内遇见一个dispatch

直接将ACC置入s0，这样返回的时候如何恢复呢？



如果假设callee执行方法时时s0已经是当前对象的指针

这样设计没问题

返回时如何恢复呢？当然就是从栈中取得之前保存过的s0。





还有什么其他设计方法吗？有的吧大概，调用方法的时候，默认SP的上一个是S0

有多种实现方法



Q：关于实参，这里没有办法进行倒序遍历，所以我将所有实参放置在fp、s0和ra存储的下面

A：

变量地址类型需要分三类





Q：还是得维护对应的方法槽位呀哈哈



Q：应该还需要维护method_name->slot的映射吧？

A：

是的，而且这个应该装在大环境中，单纯放置在类表中表达式如果不进行透传类也无法访问。

动态分派好像还是没实现，不，已经实现了，静态类型只是用于提供方法槽位的，dispatch_table一直存储在对象头中



Q：cond_class如何进行cgen呢？

A：

需要三个标签吗？每个分支完成后跳转到哪里？





Q：type_case表达式似乎比较复杂，如何设计？

A：

设定是取得expr的classtag，然后找到最近的一个祖先类节点分支执行

运行期间如何获取继承了几级呢？

喜欢



Q：看来这个type_case还有很多工作需要做呀

A：

也可以不多，只需要一点dfs技巧



Q：明天考虑一下哪些表达式移动了栈指针而没有移动回去

A：





Q：奇怪，我这里写汇编生成，还需要顾及顶层的面向对象规范吗？

A：

要的，因为对象布局就是这样设计的



Q：加法和赋值表达式如何协同设计

A：

Int的赋值和复合对象的赋值，需要分开来看吗

但是呢对象是引用拷贝

COOL中所有对象都是引用，所以e0 = e1 + e2，这个肯定要产生新的对象，原本e0指向的对象应该会被垃圾回收





Q：对象新建通过拷贝原型对象实现

A：

但是如何知道需要拷贝多少呢？原型对象中有size字段

为什么Object.copy可以不遵守convention？



Q：no_expr_class的cgen是否什么也不需要生成？

A：

大概是的，基本出现在赋值中

但是在let和init函数中我有特殊处理，不会对no_expr_class调用cgen



Q：好像还有self相关的没做好

A：

new_expr中如果是SELF_TYPE，需要有查表操作



Q：好像还有方法返回值什么的没有做好

A：

不对，保证表达式结果在ACC中就可以了

因为new也相当于一个方法分派，需要涉及到出栈入栈的东西呢





Q：负数表达式是否生成新对象？

A：

这里也就700行代码。就完成了呢



Q：p->print()这里就涉及到了，什么才是空指针？

A：

在空指针上的派发？

如果一个对象是空指针，那对应的位置就是0

要生成方法，需要的是空指针指向的dispatch_table

编译优化判空





Q：self和SELF_TYPE没有处理好

A：

self：方法体内可能会有，所以需要从全局符号表加入

符号表作用域的事情也还没处理好，依旧是类，方法，let和branch表达式需要新开作用域









Q：写完之后，第一次运行，有什么bugs？

A：

一个问题是，object表达式给出了变量地址但是没有加载值到ACC中

env.current_class没有在开启新类时全局变更

方法生成头部保留RA的FP偏移量错误，应该是offset1才对

还有生成nameTab和objTab的类顺序不一致，都应该在dfs时生成

build_method_dfs没有排除基本类

许多的汇编文件格式错误

基本类的init没有定义被定义

caller和callee清理参数的风格未统一，应该由callee清理实参，这样对齐runtime system



Q：为什么Main__init的prologue保存S0的位置不一样

A：

不管IO.out_string是什么实现，只要将方法改为callee清理实参的风格就差不多了吧，确实如此



Q：还剩下一个问题，那就是Int和String等对象的init被runtime system调用时有无将SELF进行设置

A：

有的

并且在我的new__class中也是刚好有将ACC = SELF



Q：还有问题就是符号表的空指针问题

A：

如果为空，当前let_class表达式中局部变量的偏移量应为1



Q：还有bug是let表达式分配变量空间时没有移动SP指针

A：



Q：还有问题是判断是否有无赋值的判断写反了



Q：还有就是静态分派的时候静态类型取成返回值类型了

A：

应该直接取成标识符的静态类型



Q：还有一个问题是method_class的代码生成时，FP设置错误，实际应为SP+4而非SP

A：

其实一开始我就是这么设计的，就是后来忘记改了



Q：还有一个问题是存储Int对象的值的插槽偏移写错了

A：

emit.h中预定义的INT_SLOTS是插槽数量，是用于设置类型的大小的才对
```

## Cpp相关

```
cpp tips

Q：如何开启coredump？
A：
ulimit，user limit
用于控制和限制当前shell会话及其派生子进程所能消耗的系统资源
ulimit -n，最大打开文件句柄数
ulimit -c，核心转储文件最大尺寸
ulimit -s，最大栈空间大小
ulimit -u，最大进程数

cpp tips
Q：cpp的static变量能声明在栈上吗？
A：
原来是这样啊哈哈
存储是全局的，但是作用域更小
```
