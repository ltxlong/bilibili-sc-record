# 详细的说明文档

https://sc-catch-doc.view.cloudns.ch/ 或者 https://sc-catch-doc.pages.dev/ 或者 https://ltxlong.github.io/sc-catch-doc/

# bilibili-sc-record
B站直播间SC记录板-实时同步SC、同接、高能和舰长数据，可拖拽移动，可导出，可单个SC折叠，可侧折，可搜索，可记忆配置，可生成图片（右键菜单），活动页可用，直播全屏可用，黑名单功能，不用登录，多种主题切换，自动清除超过12小时的房间SC存储，可自定义SC过期时间，可指定用户进入直播间提示、弹幕高亮和SC转弹幕，可让所有的实时SC以弹幕方式展现

# 油猴脚本
去脚本官网搜索 “B站直播间SC记录板”

# Edge浏览器
去扩展官网搜索 “B站直播间SC记录板”

# chrome浏览器（360浏览器）

如果不想用油猴脚本，而想像Edge浏览器那样的扩展的，可以：

已经将插件打包成浏览器扩展压缩包，直接下载sc_catch.zip，解压后可直接用浏览器开发者模式加载用


# diy

- 懂点代码基础的可以修改参数玩下，比如：

想要SC的记录保留长一点的时间、想要显示板的高度变更高等等。。。代码里都有参数注释


- 如果不想修改代码，而将SC记录保留的长一点：

浏览器F12，找到【应用】 

-> 存储-本地存储空间 

-> 选择https://live.bilibili.com 

-> 找到相应的 live_房间id_sc_keep_time （这个参数就是该房间最后一条SC的时间）

-> 右键，选择删除

这样，全部的直播间，在下一次进入任意一个直播间，接收到新的最后一个SC的时间，并且还要相隔12小时之后，才会触发清理该直播间的SC存储



# 版本更新时候，本tampermonkey脚本转edge脚本：
1、去掉开头的==UserScript==注释

2、将全部unsafeWindow替换为window

3、删除GM_registerMenuCommand函数

4、修改manifest.json

5、修改_locales/zh_CN目录里面的messages.json

6、图片资源需要修改的

# 非直播模拟测试自动展开：  
条件：  
 房间存在很多SC（至少两个吧）

让SC保留长时间：  
 -> 存储-本地存储空间 -> 选择https://live.bilibili.com -> 找到相应的 live_房间id_sc_keep_time -> 右键，选择删除

方法:   
 当然，先设置侧折模式，并且勾选自动展开（确保每个实时SC都有相同的展开时间）    
 将sc_custom_config_start_class_by_store函数里的 
let first_store_sc = sc_store_arr.at(-1); 修改为 let first_store_sc = sc_store_arr[0]; 

注意：  
 调试完记得修好回去！

# 关于同接和高能

插件的同接和高能数据不是计算的，而是直播间原本的websocket包的实时动态数据，

同接是指非0贡献人数，高能是指高能榜的在线所有人数，而手机上显示的是高能数。


# 🔥 功能：

- 实时数据：  
  
    >实时同步SC、同接、高能和舰长数据  
    >
    >高能：在线的总人数（App上显示的）      
    >同接：贡献值非0的人数    
    >
    >注意：有时 同接 > 高能，有时 同接 < 高能 （咱也不太理解，只管显示）    
    >
    >由于高能改版后，PC端也显示高能数了，但有时候页面该数据不更新，所以本插件接管弹幕框顶部的高能数更新，并且鼠标移动到高能数上会有提示    

- 拖拽移动  

- 导出数据  

- 展开和折叠记录板  
    
    >默认初始化的时候是折叠形态：在页面左上方一侧的一个浅蓝色圆形小图标，点击即展开

- 单个SC折叠  

    >点击SC即可折叠（隐藏内容）
    >
    >SC折叠状态下点击即可展开显示完整

- 侧折模式：  

    >SC只显示头像框，大大减小记录板占的空间  
    > 
    >鼠标移进头像框时，SC会展开显示完整；鼠标移出头像框时，SC只显示头像框  
 
- 记忆配置：  
    
    >可记忆记录板的位置、主题、模式等配置  

- SC可生成图片

- 支持自定义搜索和快速定位SC    

- 活动页可用  

- 黑名单功能  

    >在工具栏上点击插件图标会显示按钮：将当前直播间 加入或移出 黑名单

- 多种主题  

- 直播全屏可用  

- 自动清除超过12小时的房间SC存储

- 对指定用户进入直播间提示、弹幕高亮、SC转高亮弹幕

  >在SC记录板的右键菜单中设置

- 可自定义SC过期时间
  >如果SC过期，则自动隐藏
  >
  >有另外的按钮可以显示所有已经隐藏的SC
  >
  >在SC记录板的右键菜单中设置

- 可让所有的实时SC以弹幕方式展现
  >在SC记录板的右键菜单中设置

- 全屏和非全屏可以分开记忆一些设置

  >在SC记录板的右键菜单中设置

- 右键菜单：  

    >SC记录板 [数据模块] 和 [按钮模块] 的右键菜单：诸多隐藏的功能  
    >
    >SC的右键菜单：将SC生成超清图片  

<br>  

# 🔔 说明：  

- 侧折的极简模式：  

    >侧折模式下，点击 [数据模块]，会提示“已设置 侧折的极简模式”，即鼠标离开记录板的时候，数据会隐藏。 
    > 
    >再此点击 [数据模块]，会提示“已退出 侧折的极简模式”，即鼠标离开记录板的时候，数据还会显示。  

- 记忆模式说明：  

    >没记：没有记忆配置     
    >题记：只记忆主题，所有<题记>房间共用一个主题配置  
    >个记：独立记忆当前房间的所有配置  
    >全记：所有的房间共用的记忆配置  

- 记忆的优先级： 
 
    >全记 > 个记 > 题记  
    >
    >进入直播房间的时候会依次检查优先级，来进行自动加载配置  

- 例子说明：  

    >有四个直播房间：  
    >A、B、C、D  
    >已经打开：A [题记]，B [个记]  
    >
    >现在打开C房间，会从 [全记]->[个记]->[题记] 依次检查，都没有则默认是[没记]。
    >  
    >当C从 [没记] 切换到 [题记] 时，如果 [题记] 存在记忆的主题，C的主题会自动切换到 [题记] 记忆的主题，当C切换主题时候，会更新 [题记] 记忆的主题  
    >
    >这个时候，虽然A和C都是 [题记] 模式，但是主题却不一样，其中C的主题才是 [题记] 记忆的最新主题，当A页面刷新后，会变为 [题记] 最新记忆的主题  
    >
    >当C从 [题记] 切换到 [个记]，[题记] 的房间中剔除C，并且C会立即生成自己的独立配置，处于 [个记] 模式下，C的所有配置操作都会独立记忆  
    >
    >当C从 [个记] 切换到 [全记]，C的 [个记] 独立配置会立即删除，并且会将自己的所有配置生成 [全记] 的配置，如果这个时候，A、B页面刷新，会自动加载 [全记] 的配置  
    >
    >现在打开D房间，由于已经存在 [全记] 的配置，所以D会自动加载 [全记] 的配置。  
    >
    >如果这个时候，D从 [全记] 切换到 [没记]，那么所有页面的 [全记] 都会失效，最多30秒后，其余 [全记] 页面的按钮会变为 [没记]（因为每30秒检查一次）  
    >刷新A、B页面，A会自动加载 [题记], B会自动加载 [个记]，即都会恢复为被 [全记] 影响之前的配置模式  

- 总结： 
 
    >[个记] 的删除时机：从 [个记] 点击按钮，手动切换到 [全记]  
    >[全记] 的删除时机：从 [全记] 点击按钮，手动切换到 [没记]  
    >
    >[题记] 和 [全记] 的区别： 
    >
    >[题记] 是一个小圈子，这个圈子有自己的主题颜色，每个房间都可以加入其中，切换加入的时候，该房间会被动的染上圈子的主题颜色，并且也有权限改变圈子的颜色  
    >
    >[全记] 是一个全局权限，当有一个房间切换到 [全记] 时，即拿到了这个全局权限，并且复制自己的所有配置附加在上面，  
    >后续每一个新进入/刷新的房间都会自动获得这个全局权限并且自动加载上面的配置。
    >  
    >当其中一个房间从 [全记] 模式切换到 [没记] 的时候，这个全局权限就会失效，最多30秒后，其余 [全记] 页面的按钮会变为 [没记]（因为每30秒检查一次），  
    >其余房间刷新页面会恢复被 [全记] 影响之前的配置模式。  

<br>  

- 因类似 “虚拟区官方频道” 这样的嵌套直播间有时没有同接数据，故优化显示（显示高能数 等于 同接数）  
  
- 同时在【右侧的弹幕滚动框】的顶部和底部添加了“同接”等数据（鼠标移动到上面还会有额外的提示）


# 关于获取roomId
3.0.0 版本开始用 window.BilibiliLive 里面的roomId，

但是遇到了一个问题，就是在Edge里面扩展和页面的window对象是隔离的，

试过了很多种方法都获取不到页面的 window.BilibiliLive，最后只能放弃了，

换回直接通过url来获取roomId的通用方法（前提是match写的好）

最后成了4.0.0版本，改用通用方法的好处是：从油猴脚本修改为Edge扩展很简单

（从5.0.0开始的时候，其实已经可以实现Edge也用window.BilibiliLive来获取roomId，但match的方法太简单了，就一直用match来获取roomId了）



### 一个小现象：

版本2.0.0以及之后，引入了html2canvas.js来实现生成图片功能

生成图片的时候会被动触发B站 bmgOnLoad undefined错误，在浏览器控制台可以看到（130个）

但是，没有啥影响，对于网站和插件来说都没有影响，生成图片功能没影响，也没错误。

只不过在控制台显示这些额外的错误而已，生成一次，显示130个，不看的话完全无所谓。

试过很多种方法，拦截，覆盖，都失败了，还是一样的触发，那就这样吧，反正完全没影响。


