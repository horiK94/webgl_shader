let gl;
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
    attributeLocation[1] = gl.getAttribLocation(prg, 'normal');
    attributeLocation[2] = gl.getAttribLocation(prg, 'color');
    
    //アトリビュートの要素数(今回は位置のxyzの3要素)
    const attributeStride = new Array();
    attributeStride[0] = 3;
    attributeStride[1] = 3;
    attributeStride[2] = 4;

    //トーラスの作成

	// トーラスの頂点データを生成
	var torusData = torus(64, 64, 0.5, 1.5, [0.75, 0.25, 0.25, 1.0]);

    //vboの生成(配列化からvboの生成)
    const pos_vbo = create_vbo(torusData.p);
    const normal_vbo = create_vbo(torusData.n);
    const color_vbo = create_vbo(torusData.c);

    const tourousVBO = [pos_vbo, normal_vbo, color_vbo];

    //iboの作成
    const tourousIBO = create_ibo(torusData.i);

    //球体の作成
    // 球体の頂点データからVBOを生成し配列に格納
    var sphereData = sphere(64, 64, 2.0, [0.25, 0.25, 0.75, 1.0]);
    var sPosition = create_vbo(sphereData.p);
    var sNormal   = create_vbo(sphereData.n);
    var sColor    = create_vbo(sphereData.c);
    var sphereVBO  = [sPosition, sNormal, sColor];

    // 球体用IBOの生成
    var sphereIBO = create_ibo(sphereData.i);

    //uniformLocationの取得
    let unitLocation = new Array();
    unitLocation[0] = gl.getUniformLocation(prg, "mvpMatrix");
    unitLocation[1] = gl.getUniformLocation(prg, "invMatrix");
    unitLocation[2] = gl.getUniformLocation(prg, "lightPosition");
    unitLocation[3] = gl.getUniformLocation(prg, "ambientColor");
    unitLocation[4] = gl.getUniformLocation(prg, "eyeDirection");
    unitLocation[5] = gl.getUniformLocation(prg, "mMatrix")

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
    var invMatrix = m.identity(m.create());

    //目線ベクトル
    const eyeDireciyon = [0.0, 0.0, 20.0];

    m.lookAt(eyeDireciyon, [0, 0, 0], [0, 1, 0], vMaterix);      //ビュー行列の設定
    m.perspective(45, c.width / c.height, 0.1, 100, pMaterix);      //プロジェクション変換行列
    m.multiply(pMaterix, vMaterix, tmpMatrix);      //プロジェクション変換行列×ビュー変換行列をtmpに保存

    //点光源の位置
    const lightPosition = [0, 0, 0];

    //環境光の色
    const ambientColor = [0.1, 0.1, 0.1, 1.0];

    //カリングの設定
    gl.enable(gl.CULL_FACE);
    //深度テストの設定
    gl.enable(gl.DEPTH_TEST);
    //深度テストの比較方法の設定
    gl.depthFunc(gl.LEQUAL);
    
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
        const tx = Math.cos(rad) * 3.5;
        const ty = Math.sin(rad) * 3.5;
        const tz = Math.sin(rad) * 3.5;

        //トーラスのVBO, IBOのセット
        set_attribute(tourousVBO, attributeLocation, attributeStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tourousIBO);

        m.identity(mMaterix);
        m.translate(mMaterix, [tx, -ty, -tz], mMaterix);
        m.rotate(mMaterix, -rad, [0, 1, 1], mMaterix);
        m.multiply(tmpMatrix, mMaterix, mvpMatrix);
        m.inverse(mMaterix, invMatrix);

        m.inverse(mMaterix, invMatrix);
        //座標変換行列を求める
        gl.uniformMatrix4fv(unitLocation[0], false, mvpMatrix);
        gl.uniformMatrix4fv(unitLocation[1], false, invMatrix);
        gl.uniform3fv(unitLocation[2], lightPosition);
        gl.uniform4fv(unitLocation[3], ambientColor);
        gl.uniform3fv(unitLocation[4], eyeDireciyon);
        gl.uniformMatrix4fv(unitLocation[5], false, mMaterix);

        gl.drawElements(gl.TRIANGLES, torusData.i.length,  gl.UNSIGNED_SHORT, 0);

        //球の描画設定

        //球体のVBO, IBOのセット
        set_attribute(sphereVBO, attributeLocation, attributeStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIBO);

        m.identity(mMaterix);
        m.translate(mMaterix, [-tx, ty, tx], mMaterix);
        m.multiply(tmpMatrix, mMaterix, mvpMatrix);
        m.inverse(mMaterix, invMatrix);

        //uniformのセット
        gl.uniformMatrix4fv(unitLocation[0], false, mvpMatrix);
        gl.uniformMatrix4fv(unitLocation[1], false, invMatrix);
        gl.uniformMatrix4fv(unitLocation[5], false, mMaterix);

        gl.drawElements(gl.TRIANGLES, sphereData.i.length,  gl.UNSIGNED_SHORT, 0);
        
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