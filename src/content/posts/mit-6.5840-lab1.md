
---

title: mit-6.5840-lab1分析与实现

description: 实现mit-6.5840-lab1实现过程中的思考与踩坑。

published: 2025-11-23

category: 分布式

tags: [分布式, Golang, Raft]

---

```
mapreduce，我之前写过的



mrsequential是一个串行执行的MapReduce

wc：词频统计

indexer：文本索引程序



我的任务是实现coordinator协调者和worker工作者

系统运行一个协调者进程，多个并行执行的工作者进程

通过rpc通信

工作者循环：请求任务。

协作者监控工作者在合理时间范围内完成任务，设为10s，超时则将任务重新分配



main包是主函数

mr里面是我要实现的函数



输入是pg文件

输出是mr-out文件

ret变量



每个reduce任务对应一个文件

worker将map生成的中间文件本地存储，后续需要reduce任务



完成机制：协作者Done返回真

worker的退出：call协作者失败则推出





提示：

先开发worker函数



崩溃测试：某个插件会随机退出



原子写入：确保崩溃时恢复不会看见部分写入的文件





Q：思考map阶段和reduce阶段做什么。

A：map阶段统计单个文件的词频，reduce阶段合并



将中间键分配到nReduce个桶中，nReduce就是任务的数量。

每一个map应该创建nReduce个中间文件给nReduce任务使用。

就是每一个词进行hash % nReduce，mr-X-Y，这是map阶段生成的中间文件

mr-out-Y是reduce阶段生成的文件



支持排序的数据结构需要实现接口：

Len

Swap

Less



词频统计逻辑：

将所有词装入，排序，计数。



那么能够多少个map呢？

有多少个工作者就用多少个map吗？ 



mr-X-Y，X为map任务编号



Q：思考如何制作任务，用什么数据结构，支持并发的查询和修改数据结构。

A：Golang中有原生支持并发的chan类型，这个应该用起来吧。

             





Q：直接从运行时容器中删除成功执行的任务信息如何，应该可以的





插件无法加载是因为编译版本不对导致的



Q：我这个worker不生成中间文件，除非成功执行，那就没必要原子设置文件名了

A：最后一步崩溃检查没有通过？



失败的测试用例：

reduce parallel

map parallel

indexer

crash test





是我犯蠢了

mapreduce不仅仅是统计词频

功能还有更高层的抽象

还有单个reduce任务应该收集全部的reduce文件才能开始处理





debug

神奇的bug一个是file文件的命名冲突，导致每次文件被删除

一个是云端开发时windows下的换行符和linux的换行符不一致的问题。
```

Golang相关

```
golang tips

go build指令

-buildmode

plugin

exe：生成可执行文件，不能没有main函数



go run

不生成可执行文件

使用在快速测试开发场景

编译后立即运行

临时文件存放在临时目录



golang的枚举定义

类型别名+自增键



chan设计为不可重入锁



Q：golang中如何定义死锁？

A：一个0缓冲通道有写者没有读者，所有协程永远阻塞，导致死锁





Q：golang遍历时删除map元素允许，遍历时添加map元素不允许

A：那么cpp呢？应该也是一样的吧
```
