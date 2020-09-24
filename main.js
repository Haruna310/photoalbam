const downloadPhotoImage = photoImageLocation => firebase
  .storage()
  .ref(photoImageLocation)
  .getDownloadURL() 
  .catch((error) => {
    console.error('写真のダウンロードに失敗:', error);
  });

const displayPhotoImage = ($divTag, url) => {
  $divTag.find('.photo-item__image').attr({
    src: url,
  });
};

const deletePhoto = (photoId,vals) =>{
  firebase
    .database()
    .ref(`photos/${vals}`)
    .child(photoId)
    .remove();
};
    

const createPhotoDiv = (photoId, photoData) => {
  const $divTag = $('#photo-template > .photo-item').clone();
  var vals = document.getElementById('pref_id').value;

  $divTag.find('.photo-item__title').text(photoData.photoTitle);
  $divTag.append('<button onclick="deletePhoto(\'' + photoId + '\',\'' + vals + '\');"/>:DELETE</button>');
  downloadPhotoImage(photoData.photoImageLocation).then((url) => {
    displayPhotoImage($divTag, url);
  });  

  $divTag.attr('id', `photo-id-${photoId}`);

  return $divTag;
};

const resetPhotoalbamView = () => {
  $('#photo-list').empty();
};

const addPhoto = (photoId, photoData) => {
  const $divTag = createPhotoDiv(photoId, photoData);
  $divTag.appendTo('#photo-list');
};

const loadPhotoalbamView = () => {
  $('#pref_id').on('change', () => {
    var val = document.getElementById('pref_id').value;
    console.log(val);
    resetPhotoalbamView();
    
    const photosRef = firebase
      .database()
      .ref(`photos/${val}`)
      .orderByChild('createdAt');

    photosRef.off('child_removed');
    photosRef.off('child_added');
  
    photosRef.on('child_removed', (photoSnapshot) => {
      const photoId = photoSnapshot.key;
      const $photo = $(`#photo-id-${photoId}`);
      $photo.remove();
    });
  
    photosRef.on('child_added', (photoSnapshot) => {
      const photoId = photoSnapshot.key;
      const photoData = photoSnapshot.val();
    
      addPhoto(photoId, photoData);
    });
  });
};

const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'photoalbam') {
    loadPhotoalbamView();
  }
};

const resetLoginForm = () => {
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

const onLogin = () => {
  console.log('ログイン完了');

  showView('photoalbam');
};

const onLogout = () => {
  const photosRef = firebase.database().ref('photos');

  photosRef.off('child_removed');
  photosRef.off('child_added');

  showView('login');
};

const onWeakPassword = () => {
  resetLoginForm();
  $('#login__password').addClass('has-error');
  $('#login__help')
    .text('6文字以上のパスワードを入力してください')
    .fadeIn();
};

// ログインのときパスワードが間違っている場合に呼ばれる
const onWrongPassword = () => {
  resetLoginForm();
  $('#login__password').addClass('has-error');
  $('#login__help')
    .text('正しいパスワードを入力してください')
    .fadeIn();
};

// ログインのとき試行回数が多すぎてブロックされている場合に呼ばれる
const onTooManyRequests = () => {
  resetLoginForm();
  $('#login__submit-button').prop('disabled', true);
  $('#login__help')
    .text('試行回数が多すぎます。後ほどお試しください。')
    .fadeIn();
};

// ログインのときメールアドレスの形式が正しくない場合に呼ばれる
const onInvalidEmail = () => {
  resetLoginForm();
  $('#login__email').addClass('has-error');
  $('#login__help')
    .text('メールアドレスを正しく入力してください')
    .fadeIn();
};

// その他のログインエラーの場合に呼ばれる
const onOtherLoginError = () => {
  resetLoginForm();
  $('#login__help')
    .text('ログインに失敗しました')
    .fadeIn();
};

const catchErrorOnCreateUser = (error) => {
  // 作成失敗
  console.error('ユーザ作成に失敗:', error);
  if (error.code === 'auth/weak-password') {
    onWeakPassword();
  } else {
    // その他のエラー
    onOtherLoginError(error);
  }
};

// ログインに失敗したことをユーザーに通知する
const catchErrorOnSignIn = (error) => {
  if (error.code === 'auth/wrong-password') {
    // パスワードの間違い
    onWrongPassword();
  } else if (error.code === 'auth/too-many-requests') {
    // 試行回数多すぎてブロック中
    onTooManyRequests();
  } else if (error.code === 'auth/invalid-email') {
    // メールアドレスの形式がおかしい
    onInvalidEmail();
  } else {
    // その他のエラー
    onOtherLoginError(error);
  }
};



firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    onLogin();
  } else {
    onLogout();
  }
});

$('#login-form').on('submit', (e) => {
  e.preventDefault();

  const $loginButton = $('#login__submit-button');
  $loginButton.text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      console.log('ログインしました。');
      resetLoginForm();
    })
    .catch((error) => {
      console.error('ログイン失敗:', error);
      if (error.code === 'auth/user-not-found') {
        // 該当ユーザが存在しない場合は新規作成する
        firebase
          .auth()
          .createUserWithEmailAndPassword(email, password)
          .then(() => {
            // 作成成功
            console.log('ユーザを作成しました');
          })
          .catch(catchErrorOnCreateUser);
      } else {
        catchErrorOnSignIn(error);
      }
    });
});

$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});


const resetAddPhotos = () => {
  $('#photo-form')[0].reset();
  $('#add-photo-image-label').text('');
  $('#submit_add_photo')
    .prop('disabled', false)
    .text('保存する');
};

$('#add-photo-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#add-photo-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('ファイルを選択');
  }
});

$('#photo-form').on('submit', (e) => {
  e.preventDefault();


  $('#submit_add_photo')
    .prop('disabled', true)
    .text('送信中…');


  const photoTitle = $('#add-photo-title').val();

  const $photoImage = $('#add-photo-image');
  const { files } = $photoImage[0];

  if(files.length === 0){
    return;
  }
  const file = files[0];
  const filename = file.name;
  const photoImageLocation = `photo-images/${filename}`;
  const pref_name = document.getElementById("pref_name").value;
  
  console.log('uploading...');
  firebase
    .storage()
    .ref(photoImageLocation)
    .put(file)
    .then(() => {
      const photoData = {
        photoTitle,
        photoImageLocation,
        createdAt: firebase.database.ServerValue.TIMESTAMP,

      };
      return firebase
        .database()
        .ref(`photos/${pref_name}`)
        .push(photoData);
    })
    .then(() => {
      $('#add-photos').modal('hide');
      resetAddPhotos();
    })
    .catch((error) => {
      console.error('error:', error);
      resetAddPhotos();
      $('#add-photo__help')
        .text('保存できませんでした')
        .fadeIn();
    });
});
