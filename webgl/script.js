let gl;
//jsは function hoge(){ }みたいな感じで書かないと内部の変数でエラーを吐く
onload = () => {
    // canvasエレメントを取得
    var c = document.getElementById('canvas');
    c.width = 300;
    c.height = 300;

    // webglコンテキストを取得
    //描画などの処理を一括して引き受けるオブジェクト
    gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    //フラグメントシェーダーとバーテックスシェーダーの生成
    const v_shader = create_shader('vshader');
    const f_shader = create_shader('fshader');

    console.log(f_shader)
    //プログラムオブジェクトの生成とリンク
    const prg = create_program(v_shader, f_shader);

    //attributeLocationの取得
    const attributeLocation = new Array(2);
    attributeLocation[0] = gl.getAttribLocation(prg, 'position');
    attributeLocation[1] = gl.getAttribLocation(prg, 'color');
    
    //アトリビュートの要素数(今回は位置のxyzの3要素)
    const attributeStride = new Array(2);
    attributeStride[0] = 3;
    attributeStride[1] = 4;

    const index_

    //モデルデータ
    var vertex_position = [
        // X,   Y,   Z
         0.0, 1.0, 0.0,
         1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0
    ];

    // 頂点の色情報を格納する配列
    var vertex_color = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];

    //vboの生成(配列化からvboの生成)
    const pos_vbo = create_vbo(vertex_position);
    const color_vbo = create_vbo(vertex_color);

    set_attribute([pos_vbo, color_vbo], attributeLocation, attributeStride);

    //uniformLocationの取得
    const uniLocation = gl.getUniformLocation(prg, "mvpMatrix");

    var count = 0;

    //行列計算    
    var m = new matIV();
    //Matrixは単位行列
    //var Matrix = m.identity(m.create());

    //モデル変換行列 (x方向に1移動したもの)
    //引数 : 元となる行列, 原点からの移動距離を表すベクトル, 演算結果を格納する行列
    //m.translate(Matrix, [1.0, 0.0, 0.0], Matrix);

    // 移動・回転・拡大縮小は順序に気ｓをつけること
    // 基本的には 拡大縮小 > 回転 > 移動だが、
    // OpenGLは列オーダー（行列　× ベクトル(列)）なのでこの逆順になる

    //プロジェクション × ビュー × モデルでかける
    var mMaterix = m.identity(m.create());
    var vMaterix = m.identity(m.create());
    var pMaterix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());

    m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMaterix);      //ビュー行列の設定
    m.perspective(45, c.width / c.height, 0.1, 100, pMaterix);      //プロジェクション変換行列
    m.multiply(pMaterix, vMaterix, tmpMatrix);      //プロジェクション変換行列×ビュー変換行列をtmpに保存
    
    (function(){
        // canvasを黒でクリア(初期化)する
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        //canvesクリア時の深度設定
        gl.clearDepth(1.0);
        //画面上の色をクリアするには COLOR_BUFFER_BIT(コレで指定した色でクリアできる)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        count++;

        //ラジアンを求める
        const rad = (count % 360) * Math.PI / 180;
        
        //モデル1は(0, 1)を中心とした円軌道の移動
        const x = Math.cos(rad);
        const y = Math.sin(rad);
        m.identity(mMaterix);           //mMatrixを単位行列に
        m.translate(mMaterix, [x, y + 1.0, 0.0], mMaterix);

        //座標変換行列を求める
        m.multiply(tmpMatrix, mMaterix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        //モデル2はY軸を中心回転(列オーダーなので位置行列が先)
        m.identity(mMaterix);
        //位置は(1, -1)
        m.translate(mMaterix, [1.0, -1.0, 0.0], mMaterix);
        //y軸を中心に回転
        m.rotate(mMaterix, rad, [0, 1, 0], mMaterix);

        //座標変換行列を求める
        m.multiply(tmpMatrix, mMaterix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        //モデル3は拡大縮小
        const s = Math.sin(rad) + 1.0;
        m.identity(mMaterix);
        m.translate(mMaterix, [-1.0, -1.0, 0], mMaterix);
        m.scale(mMaterix, [s, s, 0.0], mMaterix);

        //座標変換行列を求める
        m.multiply(tmpMatrix, mMaterix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

		// コンテキストの再描画
        gl.flush();

        // ループのために再帰呼び出し
        setTimeout(arguments.callee, 1000 / 30);
    })();

    // //モデル変換行列計算
    // m.translate(mMaterix, [1.5, 0, 0], mMaterix);
    // //1つめの変換行列
    // m.multiply(tmpMatrix, mMaterix, mvpMatrix);

    // gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
    // gl.drawArrays(gl.TRIANGLES, 0, 3);

    // m.identity(mMaterix);

    // //モデル変換行列計算
    // m.translate(mMaterix, [-1.5, 0, 0], mMaterix);
    // //1つめの変換行列
    // m.multiply(tmpMatrix, mMaterix, mvpMatrix);

    // gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
    // gl.drawArrays(gl.TRIANGLES, 0, 3);

    // gl.flush();
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
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER. null);

    return ibo;
}