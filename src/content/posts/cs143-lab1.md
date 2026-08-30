---
title: cs-143-lab1分析与实现

description: cs-143-lab1实现过程中的思考与踩坑。

published: 2026-06-10

category: 编译器

tags: [编译器, Cpp]
---
```
spim是mips硬件架构模拟器

不过这里spim需要依赖ld-linux.so.2



Q：Main类继承了内置的IO类，IO有什么方法可以调用？

A：

out_string

out_int

in_string

in_int







Q：这个lab的内容是什么？

A：

利用栈机器编程熟悉COOL语言

先是一个解释器模式

要么需要栈，也就是一个容器类型

要么需要指针，指针如何表示





Q：这个stack-machine有6中元素

A：

int

+

s

e

d

x



e只在栈顶为+以及s的时候有作用。返回的是什么呢？







Q：对象的复制语义是什么？

A：

gpt说是引用的语义，这和Java是一样的





Q：说的是使用行为型设计模式，解释器设计模式

A：

每个command的子类封装eval之类的行为，自己负责自己的工作。

IntCommand

PlusCommand

SwapCommand

还有呢，所谓的狗屎玩意。哈哈





Q：COOL中如果一个方法什么也不返回，returntype写什么呢？

A：







Q：COOL语言中如何写返回值？什么是表达式？也就是什么时候写分号？

A：

表达式语言，所有表达式都有值





Q：COOL中有为Int实现+的语义吗？

A：

是的，这个也是build-in的语义





Q：COOL中Object是所有类型的父类吗？

A；

是的





Q：COOL不像Java那样有向下转型的语句

A：

只有case语法来获得运行时类型、就是这样子的

很好哦





Q：COOL中的循环怎么写？

A：

while cond loop

    expr

pool





Q：COOL中有什么数据类型？

A：

Int

Bool

String

Object

IO

SELF_TYPE





Q：COOL中允许多条件分支吗？

A：

gpt说不允许，只能写嵌套的if else fi，真的很烦，这种语言



Q：COOL中如果我仅仅想执行if语句，不想执行else的代码块，有什么优雅写法？

A：





Q：第一次实战有什么COOL语法错误？

A：

new不加括号

class的结尾要有分号

方法后面也要有分号

block中每个表达式都需要分号结尾

不支持类属性访问



Q：为什么非得一个表达式？

A：

while也要放进let的表达式？原来那个是作用域的问题，let生明了变量，同时需要声明其作用域，这是函数式编程的精髓吗？
```
