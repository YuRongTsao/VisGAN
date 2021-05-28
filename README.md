# VisGAN
在探索資料集時，通常會產生多張統計圖表並排列分析後得到insights，此專案嘗試使用GAN網路配合RNN模型訓練，生成一連串的視覺化圖表(visualization sequences)來找出資料集中的insights

## Motivation
在自動化生成一連串圖表的研究中，最大的兩個瓶頸是
1. **訓練資料的不足**
因圖表序列的判讀與dataset的領域有高度相關，過去的研究專注在為某些特定領域的dataset (ex: weather, stock, transaction data)開發找出insights的工具，
因此很難得到大量的**正確的序列**來進行訓練。

2. **如何去定義生成結果的好壞**
為了解決training data 不足的問題，嘗試使用了**Reinforcement Learning**的方式來得到結果，但又會衍生出第二個問題。
圖表判讀不像圖形辨識有標準答案，無法給每個序列標記**正確或不正確**，或是**某序列的獎勵得分**，因而缺少了**reward function**

因此本研究嘗試使用 [SeqGAN](https://arxiv.org/abs/1609.05473) 提出的 GAN / inverse RL 模型來解決沒有標準reward function的問題

## Model
模型基於[SeqGAN](https://arxiv.org/abs/1609.05473) 進行修改
![image](https://user-images.githubusercontent.com/28348725/119102667-dba16380-ba4c-11eb-9a97-6621b45bcfe2.png)

Note:　The code is based on the previous work by [LantaoYU](https://github.com/LantaoYu/SeqGAN)

### Sample representation
在VisGAN中，我們把一張統計圖表視為一個字(word)，圖表序列視為一句話(sentence)，再將每張圖轉換為embedding (word embedding)來做訓練
![image](https://user-images.githubusercontent.com/28348725/119921772-308b2f80-bfa1-11eb-8164-3ef3c8090fbe.png)

## Dataset
利用previous work,[GraphScape](https://dl.acm.org/doi/10.1145/3025453.3025866), 找出的visualization sequences 當作正確的圖表序列來當training data

## Result
生成的結果利用網頁來視覺化呈現
* Server : python flask
* Database : mongoDB
* Client : HTML, javascript, chart.js

![image](https://user-images.githubusercontent.com/28348725/119955509-b07dbd80-bfd2-11eb-9cb7-49a392aa8191.png)
- 左半邊為 data information
- 右半邊將 model 生成的圖表資訊(文字) 用視覺化圖表呈現，形成一連串的visulization sequences

**Example**



