let gl;
// let texture;
//jsは function hoge(){ }みたいな感じで書かないと内部の変数でエラーを吐く
onload = () => {
    // canvasエレメントを取得
    var c = document.getElementById('canvas');
    c.width = 500;
    c.height = 300;

    // webglコンテキストを取得
    //描画などの処理を一括して引き受けるオブジェクト
    gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    //フラグメントシェーダーとバーテックスシェーダーの生成
    const v_shader = create_shader('vshader');
    const f_shader = create_shader('fshader');

    //プログラムオブジェクトの生成とリンク
    const prg = create_program(v_shader, f_shader);

    //attributeLocationの取得
    const attributeLocation = new Array();
    attributeLocation[0] = gl.getAttribLocation(prg, 'position');
    attributeLocation[1] = gl.getAttribLocation(prg, 'color');
    attributeLocation[2] = gl.getAttribLocation(prg, 'textureCoord');
    
    //アトリビュートの要素数(今回は位置のxyzの3要素)
    const attributeStride = new Array();
    attributeStride[0] = 3;
    attributeStride[1] = 4;
    attributeStride[2] = 2;     //u, vの2つ

    var position = [
        // X,   Y,   Z
       -1.0,  1.0,  0.0,
        1.0,  1.0,  0.0,
       -1.0, -1.0,  0.0,
        1.0, -1.0,  0.0
    ];
    // 頂点の色情報を格納する配列
    var color = [
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
    ];

    var textureCoord = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
    ]

    // 頂点のインデックスを格納する配列
    var index = [
        0, 1, 2,
        1, 2, 3
    ];

    const vPosition = create_vbo(position);
    const vColor = create_vbo(color);
    const vTextureCoord = create_vbo(textureCoord);
    const VBOList = [vPosition, vColor, vTextureCoord];
    const iboList = create_ibo(index);

    set_attribute(VBOList, attributeLocation, attributeStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboList);

    //uniformLocationの取得
    let unitLocation = new Array();
    unitLocation[0] = gl.getUniformLocation(prg, "mvpMatrix");
    unitLocation[1] = gl.getUniformLocation(prg, "texture");

    var count = 0;

    //行列計算    
    var m = new matIV();
    // 移動・回転・拡大縮小は順序に気ｓをつけること
    // 基本的には 拡大縮小 > 回転 > 移動だが、
    // OpenGLは列オーダー（行列　× ベクトル(列)）なのでこの逆順になる

    //プロジェクション × ビュー × モデルでかける
    var mMaterix = m.identity(m.create());
    var vMaterix = m.identity(m.create());
    var pMaterix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());

    m.lookAt([0, 2.0, 5.0], [0, 0, 0], [0, 1, 0], vMaterix);      //ビュー行列の設定
    m.perspective(45, c.width / c.height, 0.1, 100, pMaterix);      //プロジェクション変換行列
    m.multiply(pMaterix, vMaterix, tmpMatrix);      //プロジェクション変換行列×ビュー変換行列をtmpに保存

    //深度テストの設定
    gl.enable(gl.DEPTH_TEST);
    //深度テストの比較方法の設定
    gl.depthFunc(gl.LEQUAL);

    //有効にするテクスチャユニットの設定
    gl.activeTexture(gl.TEXTURE0);  //0番目のユニットの有効化

    var texture = null;

    //テクスチャの生成
    create_texture('texture.png');
    
    (function(){
        // canvasを黒でクリア(初期化)する
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        //canvesクリア時の深度設定
        gl.clearDepth(1.0);
        //画面上の色をクリアするには COLOR_BUFFER_BIT(コレで指定した色でクリアできる)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        count++;
        //座標を求める
        const rad = (count % 360) * Math.PI / 180;

        //textureの処理をしたいため、バインドする
        gl.bindTexture(gl.TEXTURE_2D, texture);

        //uniformのセット
        gl.uniform1i(unitLocation[1], 0);     //textureに0という整数値を登録

        m.identity(mMaterix);
        m.rotate(mMaterix, rad, [0, 1, 0], mMaterix);
        m.multiply(tmpMatrix, mMaterix, mvpMatrix);

        //uniformのセット
        gl.uniformMatrix4fv(unitLocation[0], false, mvpMatrix);
        gl.drawElements(gl.TRIANGLES, iboList.length,  gl.UNSIGNED_SHORT, 0);
        
		// コンテキストの再描画
        gl.flush();

        // ループのために再帰呼び出し
        setTimeout(arguments.callee, 1000 / 30);
    })();
};

set_attribute = (vbo, attL, attS) => {
    //頂点オブジェクトの数だけ回す
    for(var i in vbo){
        //vboのバインド
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
        //attribute属性を有効
        gl.enableVertexAttribArray(attL[i]);
        //attribute属性の登録
        gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
};

//シェーダーの生成・コンパイル
//引数としてshaderのid名が入ってくる
create_shader = (id) => {
    //シェーダー格納変数
    let shader;

    //HTMLからscriptタグへの参照取得
    const scriptElement = document.getElementById(id);
    //console.log(scriptElement.type);

    if (!scriptElement)
    {
        // scriptタグがなかった
        return;
    }

    //type属性チェック
    switch (scriptElement.type)
    {
        case 'x-shader/x-vertex':
            //頂点シェーダーの生成
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;
        
        case 'x-shader/x-fragment':
            //フラグメントシェーダーの生成
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
    
        default:
            break;
    }

    //console.log(shader);
    //生成したシェーダーにソース割当て
    //第1引数: 対象のshader, 第2引数: 割り当てたいシェーダーのソース
    gl.shaderSource(shader, scriptElement.text);

    //シェーダーのコンパイル
    gl.compileShader(shader);

    //シェーダーがコンパイルされたかはシェーダーのパラメータで確認出来る
    //getShaderParameter: シェーダーのパラメータ取得
    //COMPILE_STATUS: webGLの組み込み定数. コンパイル状態を所持
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        return shader;
    }else{
        //失敗. getShaderInfoLogでシェーダーのログが取得できる
        alert(gl.getShaderInfoLog(shader));
    }
};

//頂点シェーダーからフラグメントシェーダーへverying修飾子を付けたデータを橋渡しする
//「プログラムオブジェクト」の生成及び、Shaderとのリンクをする関数
create_program = (vs, fs) => {
    //プログラムオブジェクトの再生
    let program = gl.createProgram();
    
    //プログラムオブジェクトにシェーダーの割当
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    //プログラムオブジェクトによって二つのシェーダーをリンクをさせる
    gl.linkProgram(program);

    //シェーダーが正しくリンクされたかはプログラムオブジェクトのパラメータで確認出来る
    //getProgramParameter: プログラムオブジェクトのパラメータ取得
    //LINK_STATUS: webGLの組み込み定数. リンク状態を所持
    if (gl.getProgramParameter(program, gl.LINK_STATUS)){
        //成功. プログラムオブジェクトを有効にする
        //有効にしないとプログラムオブジェクトがwebGLに正しく認識されなくなるので注意!!
        gl.useProgram(program);

        return program;
    }else{
        //失敗. shaderの時と似ていて、getProgramInfoLog でプログラムオブジェクトのログが取得できる
        alert(gl.getProgramInfoLog(program));
    }
}

//配列をVBOに書き込む
create_vbo = (data) => {
    //バッファオブジェクトの作成(VBOを生成するわけではない)
    //どんな値を格納したかで用途が変わる
    let vbo = gl.createBuffer();

    //webGLにバインド出来るバッファは1度に1つ. 
    //他のバッファ操作をしたい場合は適時バッファをバインドする必要がある

    //バッファを操作するには webGLにバインドする必要がある
    //(バッファという名のディスクにデータを書き込むために、WebGL という名のドライブにセットするようなイメージ)
    //第1引数: バッファの種類指定. gl.ARRAY_BUFFERという組み込み定数を指定するとVBOが生成できる
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    //バッファにデータをセット
    //Float32Array: jsの型付き配列. 浮動小数点数を扱う型を持つ配列オブジェクト
    //gl.STATIC_DRAW: バッファがどのような頻度で内容を更新されるかを指定. 
    //STATIC_DRAWはそのまま何度も利用するときに使用
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    //バッファのバインドを無効化
    //バッファのディスクを、webGlのドライバから外すイメージ
    //バインドされたままになって予期せぬエラーになるのを抑える
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    //イメージとしては、
    //ディスクにvboをセット(コレがバインド)して、dataをそこに入れる(PCがwebGLみたいなイメージ)(これがbufferData)

    return vbo;
}

create_ibo = (data) => {
    //iboのバッファ作成
    const ibo = gl.createBuffer();

    //IBOであることをgl.ELEMENT_ARRAY_BUFFERという組み込み定数で指定
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    //バッファにデータセット
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

    //バインド無効化
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return ibo;
}

/*
row: 円をいくつで構成するか
column: パイプをどのくらい分割するか
*/
torus = (row, column, irad, orad, color) => {
    let pos = new Array();
    let nor = new Array();
    let col = new Array();
    let idx = new Array();
    for(let i = 0; i <= row; i++){
        let r = Math.PI * 2 / row * i;
        let rr = Math.cos(r);
        let ry = Math.sin(r);
        for(let j = 0; j <= column; j++)
        {
            let pr = Math.PI * 2 / column * j;
            let tx = (rr * irad + orad) * Math.cos(pr);
            let ty = ry * irad;
            let tz = (rr * irad + orad) * Math.sin(pr);
            let rx = rr * Math.cos(pr);
            let rz = rr * Math.sin(pr);
            let tc = color;
            if(!color){
                tc = hsva(360 / column * j , 1, 1, 1);
            }
            pos.push(tx, ty, tz);
            nor.push(rx, ry, rz);
            col.push(tc[0], tc[1], tc[2], tc[3]);
        }
    }
    for(let i = 0; i < row; i++)
    {
        for(let j = 0; j < column; j++){
            let r = (column + 1) * i + j;
            idx.push(r, r + column + 1, r + 1);
            idx.push(r + column + 1, r + column + 2, r + 1);
        }
    }
    return {p: pos, n: nor, c: col, i: idx};
};

hsva = (h, s, v, a) => {
    if(s > 1 || v > 1 || a > 1){return;}
    var th = h % 360;
    var i = Math.floor(th / 60);
    var f = th / 60 - i;
    var m = v * (1 - s);
    var n = v * (1 - s * f);
    var k = v * (1 - s * (1 - f));
    var color = new Array();
    if(!s > 0 && !s < 0){
        color.push(v, v, v, a); 
    } else {
        var r = new Array(v, n, m, m, k, v);
        var g = new Array(k, v, v, n, m, m);
        var b = new Array(m, m, k, v, v, n);
        color.push(r[i], g[i], b[i], a);
    }
    return color;
}

// 球体を生成する関数
sphere = (row, column, rad, color) => {
    var pos = new Array(), nor = new Array(),
        col = new Array(), idx = new Array();
    for(var i = 0; i <= row; i++){
        var r = Math.PI / row * i;
        var ry = Math.cos(r);
        var rr = Math.sin(r);
        for(var ii = 0; ii <= column; ii++){
            var tr = Math.PI * 2 / column * ii;
            var tx = rr * rad * Math.cos(tr);
            var ty = ry * rad;
            var tz = rr * rad * Math.sin(tr);
            var rx = rr * Math.cos(tr);
            var rz = rr * Math.sin(tr);
            if(color){
                var tc = color;
            }else{
                tc = hsva(360 / row * i, 1, 1, 1);
            }
            pos.push(tx, ty, tz);
            nor.push(rx, ry, rz);
            col.push(tc[0], tc[1], tc[2], tc[3]);
        }
    }
    r = 0;
    for(i = 0; i < row; i++){
        for(ii = 0; ii < column; ii++){
            r = (column + 1) * i + ii;
            idx.push(r, r + 1, r + column + 2);
            idx.push(r, r + column + 2, r + column + 1);
        }
    }
    return {p : pos, n : nor, c : col, i : idx};
}

create_texture = (id) => {
    //イメージオブジェクトの生成
    let img = new Image();

    //Textureに画像データを紐づけるために必要なtexImage2D関数は画像データが読み込まれてから呼ぶ必要がある
    const elements = document.getElementById(id);

    //読み込み時の処理を記述(画像読み込み前に)
    img.onload = () => {
        //onloadは画像データが読み込み終わったら呼ばれる
        //テクスチャオブジェクトの生成(これでテクスチャに関する処理が可能に)
        const tex = gl.createTexture();

        //webGLにバインド(これで処理が適用されるようになる)
        gl.bindTexture(gl.TEXTURE_2D, tex);

        //テクスチャへイメージを適用
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        //ミップマップ生成
        gl.generateMipmap(gl.TEXTURE_2D);

        //テクスチャのバインドを無効
        gl.bindTexture(gl.TEXTURE_2D, null);

        //生成したテクスチャオブジェクトをグローバル変数へ代入
        //(オンロードイベントが変数を返すことができないため)
        texture = tex;
    };

    //イメージオブジェクトのソース指定(読み込み開始)
    img.src = "https://wgld.org/s/sample_014/texture.png";
}
