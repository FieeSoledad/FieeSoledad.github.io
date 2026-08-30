---



title: cmu-10714-hw4_extra分析与实现

description: 实现cmu-10714-hw4_extra过程中的思考与踩坑。

published: 2026-03-11

category: MLSys

tags: [MLSys, Cpp]

---

```
transformer的实现



sequentce modeling tasks序列建模任务，之前的state-of-the-art模型







part1

Transformer组件由三个主要组件构成

1Masked Multi-Head Attention

能够自适应地关注序列中的不同时间步

2Redisual Block，残差块

由两个部分组成

attention层

一个两层神经网络，该网络会在每个时间步独立地应用

3Transformer模型

由多个Redisual Block堆叠而成



本次作业中，我将实现的是Decoder-only Transformer



Layer Normallization被应用在每个残差块的开头，被称做Prenorm的变体







Multi-Head Attention，多头注意力机制

第一步是批量矩阵乘

对于自回归auto-regressive Transformer，注意力需要支持因果掩码，causal masking，

需要保证预测下一个token时，只依赖当前token之前的token

因果掩码应该在softmax之前应用，对矩阵需要先进行

然后应用dropout





关于这个因果掩码，

需要掩盖和保留的位置是哪里？

np.triu，k=j-i+1，k可以控制看见的位置

j=i时，self-attention自注意力

j!=i时，cross-attention交叉注意力

如果k=0，也不能看自己，属于严格因果注意力

如果k=1，不能看未来，标准因果

如果non-masked，能看见所有token，这种就是BERT等编码器模型



左程云，比较远离JS其实也是比较远离真正的计算机思维，比较远离计算机思维吗？原来如此

QK矩阵相乘？







Q：多头注意力，为什么需要多头？

A：

学习到不同关系的注意力

多头的QKV的初始化会打破对称性



Q：公式中为什么要除根号D?

A：

还是方差的问题吧





part2

实现带可训练参数的self-attention层



从这里就能看见MultiHeadAttention是如何并行的了

多个头的QKV都初始化为一个大矩阵



Q：为什么我总感觉在这里projection这几部分就将所谓QKV相乘的内容做完了？

A：

其实没做完，只是将所谓的词向量映射到对应的空间罢了。

为什么非得有这个词向量‘



所以我看这个多头注意力根本没有哪里需要非并行化呀？









Q：为什么计算完QK.T之后要立刻进入Dropout

A：



放在scores上有无法删除注意力连接，和指数放大问题

放在softmax之后，也是不符合语义吗？变成了随机删除features











part3

实现prenorm残差Transformer层

将Attention层与前馈网络feedforward network组合起来

得到一个可以堆叠的残差块











part4

需要将上一节实现的残差Transformer层residual transformer layer组合起来，构建完整的Transformer模型



接下来看层数

需要创建num_layers个transformer残差层

目前的实现是对序列排列不敏感的实现，模型无法区分token在序列中的位置，需要进行位置嵌入positional embedding

原始论文实现的是正弦位置编码，在第一个Transformer之前将其加到输入的embedding上，现在更常见的是learned positional embedding，可学习型位置编码，好好利用nn.Embedding



这就是位置编码吗？感觉不太行呢，为什么有这种感觉呢？总觉得很累，很无聊，



为什么有一个batch_first参数呢，为什么会有batch_first参数呢？我准备看看阿里巴巴的sink注意力吗



最后有一个case过不了，不知道误差是怎么累积的







明天再来问问：为什么k_v可能不等q_features







Q：什么是门控注意力？

A：qwen关于这个就有一个关于门控注意力的魔改，获得了NIPS的最佳论文

解决了attention sink和引入非线性以及稀疏性的机制





Q：为什么说我实现的transformer是一个decoder-only的transformer？

A：





Q：什么是autoregressive 

A：

现在工业界主流使用的都是decoder-only transformer



Q：transformerlayer的输出是btd，如何生成概率分布？

A：

将这个out*W映射到b*t*vocab空间得到logits



Q：什么是自回归生成？

A：



Q：什么是KV Cache

A：

工业模型推理时不会每次重新计算整个序列

而是缓存K，V，这样每步只计算新token

为什么Q不能缓存呢？

这个后面得来问问

因为Q是不需要的，其实Q*K.t因为只需要新增一个当前token关于当前和之前的token的注意力，所以只需要算出一行的K和V然后拼接到缓存矩阵上

之所以可以重用KV缓存，是因为要算当前新的token对前面每个token的注意力分数，而这个之前已经计算过了。





Q：什么是prefill阶段？

A：

将prompt一次跑通一遍，建立KVCache和最后一个token的logits







Q：什么叫做当前推测解码speculative decode需要两个模型，一个巨大的Target Model和一个Draft Model

A：

什么叫做小模型预预测

Gemini说可以利用我在分布式系统中学习过的乐观并发控制来理解

草稿阶段Drafting，Draft小模型一次性预测接下来的K个词，

验证阶段Verification，利用Transformer的并行特性，TargetModel的一次前向计算判断哪些预测正确，哪些预测错误

接受和修正阶段，Transformer接受正确的词，修正错误的词



Q：据说RNN的并行问题被解决了

A：

怎么解决的
```
