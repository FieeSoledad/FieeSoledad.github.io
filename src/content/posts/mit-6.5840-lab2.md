
---

title: mit-6.5840-lab2分析与实现

description: 实现mit-6.5840-lab2实现过程中的思考与踩坑。

published: 2025-12-02

category: 分布式

tags: [分布式, Golang, Raft]

---

```
开始做lab2



单机键值服务器

该服务器保证即使在网络故障下，每个put操作也最多执行一次，并且所有操作都是线性一致性的

使用这个KV服务器实现一个锁机制

复制此类服务器处理服务器崩溃的情况



每个客户端通过Clerk与键值服务器进行交互，由Clerk向服务器发送RPC请求。

客户端向服务器发送Put key,value,version和Get key不同的RPC调用



服务器维护一个map

每个键记录一个value version二元组，版本号是该键被写入的次数

put只有在版本号匹配时才自增，否则返回错误



0是特别的



线性一致的键值服务

无并发

有并发

任何操作必须能够观察到在其开始执行前已完成的所有操作产生的效果



单台服务器的线性一致性容易实现。



kvsrv1中有代码

client.go实现了一个Clerk

server.go包含了服务器代码

rpc定义恢复错误等等





第一个任务

基于可靠网络的键值服务器

需要通过Reliable测试





第二个任务

基于键值服务客户端实现锁机制

许多分布式应用中，不同机器客户端会通过键值服务器来协调活动，zookeeper和etcd允许分布式锁协调，

通过条件put操作加锁

acquire和release两个接口

同一时间只能一个一个客户端获取锁

lock.go

在更复杂的设计中，有租约



每个锁客户端需要一个唯一标识，随机字符串





第三个任务

支持消息丢包的键值服务器

涉及rpc请求的重排，延迟或丢弃

请求丢弃

响应丢弃

棘手的情况是：响应是版本错误，这下客户端无法确定put是否执行

解决：clerk重传收到的version，则必须返回ErrMaybe，交给应用程序处理这种情况

若服务器没有为每一个Clerk维护状态，就没办法实现 恰好一次的语义了





第四个任务

修改锁的实现，在网络不可靠的情况下协同工作







这个用于测试的客户端是引用了各种测试

NetWork有一个网络抽象

end是

客户端为什么要写在测试文件里

客户端成员有锁，有服务器信息，有网络



每一个Clerk

服务器名字，客户端

client.go就只是提供创建客户端，getputkey的方法



rpc定义的错误

版本错误

nokey

maybe，把什么错误交给应用程序解决



初始化Clerk，初始化客户端，会导致Network的初始化，这个有默认的吗？



server.go的结构

debug函数

KVServer结构体

getput都写成能注册为rpc服务的函数签名

kill方法可以忽略

startserver的方法，如何创建一个接口？直接使用接口的类型包装。



原来如此



为什么tester包中一个config就囊括了创建网络这些事情



配置中有makeGroupStart

里面能有创建组，startServer等方法



testKV里面有测试上下文，是否可靠，kvtest上下文



testKV绑定了许多有用的方法，比如创建客户端之类的。

创建客户端可以指定连接哪一个组

clients在创建config的时候就创建好了，并且Config获得了成员Clnts的方法提升





但是这个clnts只有一个诶





Q：clnts为什么要用锁呢？不是无状态的吗？

A：不对，有状态，会记录Clerk在哪，不过这个是个集合



Q：如何控制每个分组启动多少个服务器呢。

A：有传递一个参数



Q：如何向网络发起一个请求？

A：使用Clerk中的ClientEnd

细细研究一下这个call

这个call发送请求的时候使用一个无缓冲通道诶。













Config中有什么成员

Clnt，一个客户端，客户端关联着当前网络，还有互斥锁，记录着关联的Clerk

Group，一个分组

testing.T，测试上下文

net，当前网络

start，开始时间

t0测试开始时间

rpcs0，总的rpc数量

ops：客户端getputappend请求数量

封装行为：

设置网络可靠性



Net中有什么成员

一个互斥锁

网络可靠性

longDelays，是否在禁用连接上发送时暂停时间

longReordering，是否延迟回复，可能导致数据包重排序

ends，ClientEnd为元素，客户端map，key为客户端名

enabled，map，key为endname，是否启动  

servers，服务器map，Server为元素，key为服务器名

connectios，map，endname到servername的映射，一个server可能有多个服务

endCh，请求通道

done，关闭通道

count，总的rpc数量

bytes，总的发送字节数

封装行为：

cleanup，关闭客户端

Reliable

IsReliable判断网络可靠性

Lon设置是否延迟回复

MakeService类似于rpc.Register，这是真的吗

ReadEndNameInfo，读取客户端信息

IsServerDead，为什么客户端不连接也返回true啊，还需要传入服务器指针？

processReq，处理请求

makeEnd，创建客户端，初始化时没有启动，没有连接的服务器

deleteEnd，删除客户端

AddServer，添加服务器

DeleteServer，删除服务器

Connect，将客户端和服务器连接

Enable，启用客户端

GetCount，获取某个服务器rpc次数

GetTotalCount，获取整个网络的rpc总次数

GetTotalBytes，获取整个网络传送字节数



Service抽象

name，服务名称

rcvr，反射获取的值

typ，反射获取的类型

methods，反射获取的方法数组

封装行为

分派请求



Server抽象

互斥锁

服务列表，map，servicename->Service的映射

rpc数量



封装行为

添加服务

分派请求

获取rpc数量



reqMsg请求对象的封装

endname，客户端名称

svcmeth，服务名和方法

argtype，参数类型

args，参数的字节码

replyCh，回复通道



ServerGroup抽象

net，当前网络

srvs，服务器指针数组

servernames，服务器名

gid，组id

connected，连接状态

mks，创建服务器的方法

mu，控制并发访问



Server抽象，由服务器组持有

mu，一个互斥锁

net，反向控制网络

saved，持久化数据

endNames，这个为什么是随机持久化的

clntEnds，n个客户端







Q：什么叫做endname，这是一个客户端，还有将客户端连接到服务器的方法？

A：为什么有什么客户端连接服务器啊，直接给



Q：回想我之前看cmu15445的时候怎么看的？

A：



Q：另外一边服务器创建的时候是如何注册服务器的方法的

A：答案在net中的MakeService



Q：为什么注册服务要求方法的参数列表长度为3？这是为什么

A：





Q：为什么这个golang的反射抽象不直接保留对应的原始对象，反射调用方法的时候将对象传递进去就好，要转为Value？

A：不像Java那样吗，下面关于golang的已经有回答



Q：当前网络处理请求返回后检查服务端是否死亡的目的是什么？为什么死亡后不直接返回呢？

A：现在还不知道



Q：从头到尾似乎没有整个序列化req的代码，内存中始终有一个运行时类型argType，似乎不太真实呢

A：是这样的



Q：接下来看看MakeConfig中初始化了什么样的网络

A：

创建服务组

服务组有Server



Q：创建网络做了什么？

A：创建一个协程监听请求通道，如果有请求就单开一个协程去处理



Q：创建配置做了什么？

A：

创建网络

创建分组

启动分组服务



Q：创建分组做了什么？

A：分别取用空的Server指针，创建服务器



Q：创建服务器做了什么

A：

随机n个初始化客户端名称

创建n个客户端

将客户端与当前服务器相连接

服务器名字以当前分组和组内索引编号





Q；启动分组服务做了什么

A：

1分组启动

这里做了什么？

之前的创建服务器只是在内存中创建了服务器抽象，还没有创建真正的服务器实例

之前的服务器抽象需要创建自己的持久化层



这里调用MakeServer方法实例化服务器，并且传入一个持久化对象

为什么这里启动服务器涉及删除旧有的服务器抽象？但是好像没有大碍

这里将kv服务器的通过接口传递，制作服务，将当前服务注册进入网络

这里网络中的Server和配置中创建的服务器分组是两种Server

网络中记录当前服务器名称与具体网络服务实例的映射关系

服务器分组记录有同样的服务器实例，但是只保留了杀死服务器的API

只有网络中的服务器才有真正提供服务的接口

这里创建服务后

2连接所有

连接所有做了什么

遍历所有服务器连接

先使能当前服务器

再挨个连接所有服务器

服务器中的endnames究竟是什么概念？

含义应该是挺明显的：服务器之间也能互相通信，不过当前服务器能和自己通信吗？

这样挺合适，统一处理所有接口，比如给自己投票之类的





Q：为什么客户端要随机字符串命名？

A：其实不这样也是没有问题的吧，不太懂





Q：MakeClerk做了什么？

A：Config中提供了创建客户端的接口

创建一个客户端，连接0组0号服务

基于Config当前Clnts创建一个没有任何连接服务器的客户端Clnt

在用这个Clnt和0组0号服务器名字包装成一个Clerk



但是这个Clerk如何发送请求呢

这个Clerk有包装Get和Put的接口







Config抽象

clnts，一个客户端，为什么先有一个客户端，这个客户端只有一个互斥锁，网络，以及Clerks列表。

Groups，服务器组

testing.T，测试上下文

net，网络

start，创建时间

t0，真正开始时间

rpcs，rpc调用数

ops，getput等方法调用数



Clnt抽象

互斥锁

net网络

ends，map

srvs，服务器数组，不是很懂这个怎么用诶

封装行为

makeEnd，传入一个服务器名称，在网络中创建一个clientEnd，并将其连接到真正的服务器，在网络中开启这个客户端，当前Clnt记录下server->end的映射

call，真正的调用方法，传入服务器，方法名，args和reply，调用clientEnd调用这个服务

connectAll，连接所有，将当前Clnt记录的所有Server，将其在net中开启

connectTo，传入一个serverNames列表，这个不懂，将Clnt需要的Server在net中开启吗？将开启的服务器限定在某个范围

allowL，判断ServerName，如果当前Clnt持有或从未持有Server的客户端，返回True，否则False

Disconnect，指定某个Server在net中关闭

DisconnectAll，关闭当前Clnt所有的服务器

remove，删除当前所有的clientEnd





end里面又有什么？

name

end，clientEnd





简单说，一个Clerk聚合的一个Clnt

这个Clnt可以有多个end，每个end就是一个ClientEnd

然后这个srv还有一个服务器名称切片





Q：这个系统的各个命名也太抽象了吧





Q：整个系统如何处理请求？

A：创建的clientEnd的请求通道是net共有的通道，创建网络时有一个goroutine处理这个通道。



Q：net处理请求的详细逻辑是什么？

A：

processReq

依据当前req的客户端名称，获取其连接的服务器



现在我明白了

调用方法是KVServer.Get



Q：服务器的持久化对象在哪里？

A：在Config中的start方法，这里真正的服务器通过一个接口句柄被Config所关联，我明白了



Q：看看持久化器如何抽象的呢？

A：

成员

mu互斥锁

raftstate，一个字节数组

snapshot，快照，字节数组

封装行为：

clone状态

clone整个对象

获取状态大小

存储状态

读取状态等

这个持久化对象只以字节数组呈现，看来更高级的数据结构让我自由发挥呀。不过说的是不是这个实验发挥





这个实验相关内容：保证put只执行一次实现线性一致性

网络可能会丢包

如果客户端观察到没有收到响应

如果请求被丢包，重发一次即可

如果响应被丢包，重发一次，服务端就可能收到两份一样的请求，这就造成了歧义

两种情况无法分辨：

客户端第一次的put成功执行，第二个相同请求导致ErrVersion

第一个put就执行失败，应该返回ErrVersion





任务2

在Clerk的基础上实现一个锁



同一时间只能有一个客户端获取到锁。



现在就是只实现了添加和查询，没有实现删除。

Put key,version，不同客户端之间可没有什么共享状态呀。

不同客户端共享状态就是键值服务器呀。



Q：golang进行远程开发的调试工具是什么？

A；好像没有像cpp那样的gdb调试工具诶





Q：不可靠网络的测试目标是什么？

如果第一次就成功，那么put成功，retry是false

第一次put第一次发送成功，OK，直接结束

第一次put重试后，OK，直接成功

第一次put重试后，重试后也有可能继续失败诶，





任务3

重点：Clerk的put要一直重试到明确返回OK或者版本错误









任务4，修改我的锁实现

其实这个锁就相当于一个应用程序，需要处理ErrMaybe的情况吧
```

Golang相关

```
go env -w goproxy

这是什么呢



go test

go test是go语言内置的测试工具

go test -v 详细输出

测试文件规范：_test.go结尾





golang的反射包

TypeOf

ValueOf

Indirect：递归地解引用指针，直到得到一个非指针的值？



golang的反射也遵循可见性，未导出方法反射不可见



reflect.New是初始化一个特定类型的指针，返回一个Value，golang的反射还真是奇怪



golang的Value还要Elem才能取出值？这个golang的反射设计真的是依托



golang反射中指针接收者方法，调用者本身也是一个参数



Q：为什么反射中接收者要包装成Value，这个在Java的反射机制中找不到对应

A：



Q；golang没有Java虚拟机中的方法区那种运行时类型记录，是如何在反射时确定动态类型的？

A：这个得好好思考

Grok说golang的反射虽然难用，但是运行速度比Java快一个数量级？

Golang的运行时类型信息被烘焙（bake）进了最终的二进制文件的rodata只读数据段

每个类型在程序启动时都一个全局的类型指针，TypeOf就是返回这个类型指针

感觉这个Golang的反射不能在Java中找对应的东西，没有这个必要



什么时候带上类型指针？

any，interface{}等类型赋值的时候就有了，类型指针，编译时右值是直到类型信息的，可以获取类型指针
```
