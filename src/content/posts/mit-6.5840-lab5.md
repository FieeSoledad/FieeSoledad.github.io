---



title: mit-6.5840-lab5分析与实现

description: 实现mit-6.5840-lab5实现过程中的思考与踩坑。

published: 2025-01-03

category: 分布式

tags: [分布式, Golang, Raft]

---

```
shared kv service



本实验中，构建一个分片键值存储系统，把key按shared划分到多个服务器组，一个shared是一个键值对的子集



5A实现一个可工作的sharedctrler，存储和检索配置



5B修改sharedctrler，处理配置变更过程中的失败和网络分区



5C使多个controller并发工作而不互相干扰



5D大范围扩展，属于扩展任务，同质化内容就不做了



分片键值服务



分片的目的在于性能

每个shardgrp只处理少量的shard的put和get请求，多个shardgrp并行工作，整个系统的吞吐量可以随着shardgrp数量而线性增加





Q：我之前一直想着raft的单机性能瓶颈，怎么就想不到这个问题可以这么简单地解决呢？

A：只要分片就行了啊





shard->shardgrp



控制器controller

管理员通过另一个客户端：

增删shardgrp

更新shard到shardgrp的映射关系

核心方法：

ChangeConfigTo

将系统从当前配置切换到新配置



过程：

向shardgrp发送rpc

freezeshard

installshard

deleteshard

更新kvsrv中存储的配置



Q：为什么需要controller？

A：

分片存储系统必须能够在shardgrp之间移动shard

原因是：

1负载均衡

2动态扩容缩容



核心挑战：分片场景下保证操作的线性一致性

迁移失败的可能性是什么





configuration是指shard->shardgrp的映射

一个shardgrp服务器只属于一个shardgrp，包含的服务器集合是固定不变的





5A

实现一个shardctrler

在kvsrv中读写配置，

shardctrler在不同的shardgrp之间移动分片



Q虽然说不需要任何shardgrp，但是还是要了解一下shardconfig的结构

A

ShardConfig

Num，唯一标识

shards，shard->gid

groups，gid->strings，哪些服务器



封装行为

string

fromstring

analyze

least

rebalance

join

Leave

等行为



Q：ShardCtrler的结构和行为？

A

clnt，一个客户端

IKVClerk

killed，是否关闭



kvsrv是与raft不一样的体系，但是现在我怎么知道这个kvsrv叫什么名字呢

拥有一个客户端之后，就可以将



我都基本忘记了Clerk的用法了

clnt，一个网络客户端

server，一个服务器名，所以可以直接发送请求



然后实现一个shardgrp的初始版本，

本来要求的是拷贝lab4中的解法

还有就是在client中实现一个clerk，通过query方法来查找某个键所属的shardgrp，然后再与shardgrp通信



要求拷贝lab4中的代码，



client是向分片控制器查询分片所属的服务器组



很奇怪为什么shardCtrler持有一个客户端还需要使用clerk包一层呢







Q；说是向shardctrler查询

A：但是controler的query也不是rpc的风格呀





不对，是让我实现shardgrp，那么就是说原来的kvserver新添一个字段为gid，属于哪一个服务器组吧





Q：原来kvserver的客户端是要同时知道所有servers的地址的，我在lab4里就是这么实现的

A：那么现在的问题是这个client需要中间的一层先controller查询分片集群，那么原来的put和get接口都得大改吧





Q：我有点懵了，这个controller难道还是每人一个吗？不太对吧，这个中心配置不能去中心化

数据面data plane

控制面control plane，在逻辑上是中心化的，配置由controller驱动变更，客户端也以来其路由

A可能是通过版本号来确定集群中唯一的配置吗？



Q：但是现在配置是value，每个controller都能直接修改配置，如何进行并发控制？

A：

就当他是去中心化的吧





确实知道集群没用，还得确定哪一个是leader，这个就很麻烦了诶。





看样子要对某个集群执行put和get，需要通过MakeClerk来创建一个clerk，但是这个clerk如何缓存呢

这一层有Errmaybe语义







接下来实现changeConfigTo方法

需要从旧配置到新配置，可能需要移动分片



步骤是：

1先在原shardgrp上冻结分片，使得shardgrp拒绝正在迁移分片的put操作

2接着将该分片复制到目标shardgrp，然后删除分片

3发布新的配置



每个配置都有唯一的编号num

相关rpc应该包含所有的num



Q：冻结分片的时候可以查询，不能新增，且此时是没有新分片的



Q：为什么必须为每个shardgrp维护其所见过的最大num

A：

我记得为什么说server不需要并发控制呢，





Q：之前是上层statemachine向RSM提供DoOp接口，在这里影响状态。所以上层服务是不需要并发控制的

但是现在需要支持freeze接口，为什么有一种StopTheworld的方法，那么就是需要引入互斥锁

A：是这样的把







这样每个客户端都可以冻结一个shard，这样不是很好吧，大量竞争怎么办呢

所以初始化时候的config编号是多少呢



Q：等等，让我想想，这个config一开始就是作为string存储在shardgrp中的

但是这个初始配置没有num

并且这个配置是直接通过put接口更新的

之后的配置变更都需controller通过特定接口通知grp，总感觉很奇怪呢









Q：freeze和install这些也应该通过rsm先达成集群共识后才能执行，这是为什么呢

因为install和delete都修改了上层状态机呀，确实应该先达成共识

但是freeze这个需要吗？可以在Leader直接执行吗？就是冻结某个shard，这个也经过rsm达成共识





Q：之前的replication是如何执行get请求的呢？好像没办法执行吧

A：答案是有结果，但是无需返回呢，这样吗







Q：现在问题是每个Shardgrp如何知道自己包含哪些分片呢

A：我进行初始化的时候可没有这些内容呀

好吧，原来gid就是服务器组号+组内编号，还是能做





Q；现在是多了一个ErrWrongGroup，这个错误也要会处理诶





一个分片确实应该只有一个服务器组的，不然没法共识，但是一个服务器组确实可以拥有多个分片





Q：changeConfig是需要保证成功，所以这里应该直接将配置存储到服务器中，然后所谓的什么呢，但是服务器也有冻结key的风险

A：

但是这个设计中config单独存储一个group，并且controller的clerk这和这个group通信，暂且不管冻结的风险





Q：应该可以引入客户端的缓存机制吧

A：需要缓存吗？其实可以当做一种临时资源，没问题













Q：如果我要一直尝试变更配置，那么就需要知道版本号，但是query的api不允许返回version，该怎么办呢？

A：只能利用配置的num和version的一一对应关系了





Q；freeze返回的state为空的bug是什么

A：server在接收rsm的command执行结果后没有copy关于state的字段





Q：changeConfigTo的逻辑是如何设计的？

1先冻结原来的，然后install到新的组，然后从原组删除，前提是shard需要迁移

如果新组和原组是一样的，不需要迁移，那就直接跳过。







Q：但是install时可能没有Leader诶

A：这确实是问题，所以遍历一轮后sleep一段时间就好











要求

新的controller需要完成之前那个controller已经开始的重配置过程

本实验中的分片键值服务遵循与Flat Datacenter Storage，BigTable，Spanner，FAWN，Apache HBase等系统相同的总体设计思路

虽然这些系统在许多细节上与本实验不同，且通常更加复杂，功能也是更强，本实验不会动态演化每个raft组中的节点集合







Q：我觉得最大的问题是配置幂等，还有就是多个配置变更同时开始该怎么办

A：目前所有的join和leave都是串行调用changeConfigTo的，所以暂时不需要考虑这个问题。









Q：如何定义freeze，install和delete的成功，至少执行一次的含义

A：

直接无限循环直到收获一个OK的响应吧

client的get和put需要不断循环，freeze等应该也要呀

现在的模型太简单了，一个集群我是直到所谓的OK返回才尝试放弃，相比之前完善的put和get，只是少了一个超时处理吧，确实是这样的，只是少了超时，不过net会检查服务器是否存活









Q：这个controller离开的case是如何触发的

A：不是controller离开，是shardgrp的离开，暂时不需要考虑







Q：测试程序的changeConfig是串行执行的吗？

A：

看样子是的，5A的测试中是串行的，后面可能不一定。







Q：现在测试程序的表现：只有心跳包在不断发送，原因是什么？

A：原因是触发了ErrNokey，然后fatal，测试程序没有执行完。

这个ErrNoKey触发的原因不是分片的丢失，是因为原本的get和put没有检查当前group是否负责集群，不负责没有返回WrongGroup换组重试。







Q：现在是线性一致性都是问题了

A：应该是freeze以及install相关的接口有问题

是get和put没有检查，所以出现了ErrNoKey







Q：现在是配置发布出了问题，无法发布，不知道为什么呢

A：原来是过期判断符号的问题，只有小于最大的才不用执行，因为幂等的哦





Q：现在ErrNoKey的问题解决了，出现的是线性不一致的问题，为什么是





Q：理解freeze和install和delete如何做到线性一致

A：put做到线性一致性依赖的是版本号机制，如果版本不对无法递增，所以复数个put请求执行结果是很好check的

但是现在的install和delete没有基于版本号的幂等机制

如果是多个install和delete先后到达，比如说先delete之后，再发送了一个install，这会导致什么，这里没有并发的配置变更

一个freeze后到达也没什么关系吧，不对，不同的freeze命令配置编号是相同的，所以会有影响的，本来已经freeze了之后删除了，这会导致什么呢



Q：明天问问gpt是什么不一致的问题吧，到时候改一改

A：

线性一致性是因为什么呢，source的freeze

问题是我的这些接口天生幂等呀，应该不是这些问题吧，这个输了怎么办呢，

net中是开一个goroutine去分发请求，所以还是可能乱序到达的



应该还是过期语义的问题，我把这个当成所谓的OK了，所以给出的是key是空的val

我明白了，冻结的被允许读取了，这里迁移的时候有一个空挡吗？

是的，迁移后发布配置之前已经delete了旧有集群中的shard，所以put才能到新的group

所以这个时候应该是返回WrongGroup才对，不存在多个group服务一个shard的情况



Q：为什么不能是两个get在前面呢？但是现在的问题是get在put之后得到的这个

A：

线性一致性的时间约束



不对，是有触发到的，原来如此



为什么说直接将get也ban了就行

先试试吧，其实还是不行



但是现在我还是不太清楚之前线性一致性问题的原因是什么，不一定吧



Q：有成功额几率和失败的几率

A：有客户端一直无法获得确切的结果

似乎是有一个get一直没返回，不知道为什么，不返回呢为什么没有返回呢

这里似乎就是网络问题诶



原因可能是因为group下线了，所以连ErrWrongGroup都无法收到吗？





Q：线性一致性的原因是出现了WrongGroup时，client不会切换，导致其一直get旧版

线性一致性的检查是全部执行完成之后再检查，但是这也不是出现一致性问题的原因

扩容时候



Q：感觉很神奇，现在这个client不会切换group，但是为什么会一直请求，并且都是服务器下线。按理说

A

无服务下线我可是会因为重试太多而重新

我就说下线的时候为什么没有切换，原来是退出条件





27529开始是最后一个put并且成功

后面一直是在get了，有的get几百次都没成功，这是因为不会切换group，可能是因为服务器没有下线，一直返回WrongGroup，所以没有更换group

当groups缩容，导致group又拥有了shard，然后get就成功了

但是这个还是无法解释为什么没有frozen检查时就会出现线性一致性问题

来吧，我们假设，get成功，旧的版



我发现，只要client学会切换，就没有一致性问题，为什么可以避免？

一直循环一个什么呢，get旧版本，put到新group，然后这个时候继续做



get一直请求的旧组，put能到新组，那么下一次的get应该也是新组，为什么能打到旧组

并且WrongGroup不会切换，那可能就是一个put一直在put旧组，然后呢，等到一个窗口，own和frozen都被delete，旧组无法容纳这个put，put还是会到新组，下一次的get就会到

抓住核心：WrongGroup不切换，一直put，然后等到shard迁移回来，put成功，然后下一次get还是旧配置，此时就完了。原来如此

那么日志中应该出现多次put得到wrongroup的情况



按理说这个一直WrongGroup导致的，扩容，应该要等待很久才回来，为什么搜索下来只有集中的100多个呢？

原来是运行错了测试用例，运行原来的确实是大几百个





Q：你他妈怎么这么恶心啊，为什么还有raft层的错误

A：raft层为什么会出现这种错误，lastApplied=182，182+1-0明明应该是183，为什么是139了，







还是有线性一致性的错误，这次是ErrVersion，原来我还得管理ErrMaybe是吧，需要吗。

这次是一个客户端并发地put，然后遇见了一个ErrVersion，问题是现在只有我一个呀，为什么会出现



错误的group是否按照重试的来呢？肯定不，这个请求的作用是确定的

超时也要按重试的来



ErrVersion的来源是丢包，跟客户端几个没有关系，所以还是会有ErrVersion，确实是这样的。





Q：很奇怪，居然version=0的爆版本号错误

A：为什么会出现这个版本号错误呢

put标记maybe错误了？

原来是ErrWrongGroup的重试被我忽略了



0 1 2

2 3 4 5



Q：测试用例单独运行全都没问题，一旦一起运行就必出问题

A：golang





需要支持分片组离开的情况

Q：gid1重启也默认获得所有分片，确实有问题，不过不是主要原因吧

A：修bug



Q：观察现象：只有put成功一次，所有get全部失败，并且一直有在更换group

A：

看看changeConfig相关



没有任何ChangeConfig触发是为什么



有没有可能是Controller的put的errmaybe没有处理呢





Q：为什么会丢失install？

A：共用reply的原因。之前是什么原因  



Q：为什么leave这么慢？

A：



Q：gid1拥有所有shards如何实现，好像放在哪里都是错误的

A：必须将与分片相关的状态持久化。







Q：将与shard有关的字段持久化就解决了冷启动gid1包含所有的shard的问题

A：





Q：终于找到问题了，原来是query一直在无限重复

A：问题是为什么get需要kvserver的实现

我需要设计一种机制：在servers全部下线后Get能够正常返回的机制















5B

修改shardctrler

使其在失败和网络分区的情况下完成配置变更



Q：居然还对新的grp加入的时间效率有要求

A：真的很奇怪





Q：现在的现象是速度controller端一直在重试delete和install，

A：



现在是2号delete失败，3号freeze失败呢

为什么3号会失败呢？

必须考虑迁一半的情况呢，迁移到一半，确实不能随便加freeze的分区，所以遇见分区错误直接按照OK处理就可以了









5C

多controller并发下不干扰

添加围栏fence实现旧的rpc请求被拒绝



Q：我首先还是不明白为什么controller为什么非得使用kvserver的客户端，直接put和get是真不行吧

A：



Q：至少一次

A：出现ErrMaybe的情况需要自己去确认究竟成功了没有，这就是上层应用，今天应该可以搞定



Q：InitController的写入是否存在被抢占的可能性？

A：当然有可能，但是幂等，所以也不用重试了





Q：其实ChangeConfig也有可能被中断，导致发起者尝试完成已经完成的配置变更，就会有freeze的shard已经被迁移走的问题

A：是这样的



Q：为什么总是出现nil？

A：重试次数太少





Q：为什么测试要在一个进程中全部执行呢

A：



Q：超时退避是非常差劲的想法吧

A：导致后续逻辑无法运行，前向逻辑无法回滚



Q：现在的问题是

A：还是有超时的可能





看来是否有Clerk的差距还是比较大的诶，

是什么问题呢

我也不太清楚哦，真的很无语诶，真的离谱儿



观察：这里有多个controller在尝试install，并且都没有得到响应



难道是因为并发压力太大了？

可以增加访问间隔

可以去重所谓的什么呢，去重所谓的什么呢，真的很无语诶，这个是真的，特无语

我需要只来一个controller进行重配置吗



Q：现象：执行完成之后还是有大量的controller残留循环，应该有严重拖慢进度

A：

原因是什么

其实就是因为过期的controller没有及时结束吧，因为一旦过期，说明servers很可能已经不再是预期的配置，循环多少次都起不来



注意看：现在连一轮都过不去了，并且有大量的LoopGet循环



Q：当前配置编号大于等于目标配置编号，这个时候直接返回，有什么错误吗？

A：为什么现在一轮都过不去了



Q：为什么过期检查还会影响gid0的存活呢？

A：

减小并发压力居然到了这一步



Q：经过我的测试，我发现全都是网络错误，也就是说没有进入什么呢

A：



观察现象：244173是准备等待的最后一行

reliable网络中全程只获得了3个成功的配置，这个是正常的，因为网络可靠的，很少重试



那么问题又来了，在可靠网络中，那么多的loopget为false是什么情况，我又没有超时，没有什么呢，分区的

原来是因为client被断开，因为partition的原因



那么为什么get无法返回呢



316309：最后一个servers开始的时候，并且后续全是ErrWrongLeader

316262：gid0最后一个回应

后续还有许多的LoopGet，也就是说某些客户端也没办法请求gid0

205928最后一次选举成功

227359最后一次选举发起，不是后面的gid





268107，最后的成功get

279082，最后的成功put

279099，最后的nowgid

279367后面一长串的put得到ErrVersion怎么办，版本错误是可以直接返回的呀，确实是一种答案，但是为什么不会切换到0号服务器这个Leader呢？



Q：为什么还有这么多的LoopGet失败呢？这个时候不应该全部恢复了吗？我不太清楚，而且为什么不会切换呢？为什么呢，我很无语哦，真的特别无语哦，而且是稳定网络的稳定复现

A：可靠





284848最后的gp





server0没有不可达，他一直在

复制成功了，但是apply没有了



Q：所以是raft层推进进度的原因还是rsm层的问题？

A：

现在确定是raft层的问题了，日志推进的问题吗



Q：最终发现原因是raft层leader同步replication的超时时间窗口太小，又没有启动snapshot，导致sync没办法在10ms内完成，并且导致leader堆积的请求越来越多

恶性循环

A：将时间窗口改成500ms确实是好多了



Q：整个测试都有残留goroutine导致的跨测试污染问题，我们应该认为无限重试下去是正确的

A：那么sck.Query如果失败就休眠有什么问题？就是休眠

已知存在网络断开，导致controller长时间无法请求gid0的情况，这里要留足时间重试

已知部分测试存在后台开协程不断请求并且不等结束就退出的测试用例，如果卡在sck.Query无限重试的话会很占用资源

权衡一下就是：sck.Query长时间重试不行的话就长时间等待一下







Q：为什么go test -run 5C就能直接通过，不怕压力？

A：因为已经存在许多压力了，所以put和get的量少吗？





Q：给我什么debug经验呢？

A：

可靠网络的特征是更多的请求可达，也就是更大的服务器负载压力

找bug：打印日志，看测试堵在了哪里-》看测试堵在哪个循环中-》看为什么Leader不可达（因为服务器负载压力）-》找到服务器未处理请求堆积的原因（超时时间窗口太小了）





5D

对许多真实系统的学习

一些扩展思路：

easy，使用kvraft存储configuration，这个本就应该实现

moderate，精确一次的语义实现

moderate，实现range函数，服务器维护B树

hard，修改leader，在不通过rsm的情况下直接响应Get请求，使用lease机制

hard，支持transactions，允许开发者以原子方式执行多个put和get，一旦支持事务，就不需要versioned put，因为事务可以替代它，参考etcd的实现办

hard，修改shardkv，支持跨shard的事务，这里需要实现两阶段锁提交和两阶段锁。







lease租约：如何允许Leader直接响应Get请求？

记录Leader最后一次获得majority承认的时间，保证选举触发时间的下界，确认不可能有新的Leader

lease是防止两个Leader的情况，比如有新的Leader在更高Term提交了Put请求，当前Leader直接响应Get就可能导致线性一致性问题





Q：使用lease什么的保证没有新的Leader能选出来，但是呢，有没有可能返回特别慢呀，servers端的乱序抵达怎么呢？

A：然而问题是同一个key，client没有获得put的结果的话，是不会发出新的get请求的，所以单client别担心

乱序抵达，原来如此，这个不是看完成时间，而是看开始时间，只要put开始时间早于读取的时间，就是满足线性一致性的
```

debug经验

```
总结一下

主要问题就是：

5A残留的goroutine拖慢系统

5C中发现raft层给的超时时间窗口太短了

两个主要问题就是这样
```
