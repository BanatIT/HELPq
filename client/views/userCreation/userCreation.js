Template.userCreation.onCreated(function(){
  this.csv = new ReactiveVar("");
  this.ready = new ReactiveVar(false);
  this.error = new ReactiveVar(false);
  this.users = new ReactiveVar([]);
});

Template.userCreation.helpers({
  error: function(){
    return Template.instance().error.get();
  },
  ready: function(){
    return Template.instance().ready.get();
  },
  formattedUsers: function(){
    return Template.instance().users.get();
  }
});

Template.userCreation.events({
  "click #checkFormat": function(e, t){
    // Reset the error
    t.error.set(false);

    // Grab the csv text
    var csv = $('#usersCsv').val();

    try {
      t.users.set(formatCsv(csv, t));
      t.ready.set(true);
    } catch(err){
      t.error.set(err);
      t.ready.set(false);
    }
  },
  "click #createUsers": function(e, t){
    // Create the users one by one
    t.users.get().forEach(function(user, idx){
      Meteor.call("createAccount",
          user.username,
          user.password,
          user.profile,
          function(error){
            if (error){
              user.failed = true;
            } else {
              user.success = true;
            }
            var u = t.users.get();
            u[idx] = user;
            t.users.set(u);
          });
    });
  },
  "click #apiCheckFormat": function(e, t){
    // Reset the error
    t.error.set(false);

    try {
      t.users.set(getUsersByApi($('#usersApiURL').val()));
      t.ready.set(true);
    } catch(err){
      t.error.set(err);
      t.ready.set(false);
    }
  },
  "click #apiCreateUsers": function(e, t){
    // Create the users one by one
    t.users.get().forEach(function(user, idx){
      Meteor.call("createAccount",
          user.username,
          user.password,
          user.profile,
          function(error){
            if (error){
              user.failed = true;
            } else {
              user.success = true;
            }
            var u = t.users.get();
            u[idx] = user;
            t.users.set(u);
          });
    });
  }
});


function formatCsv(csv, t){
  var rows = csv.split('\n');

  if (csv.length == 0){
    throw "There's nothing here.";
  }

  var users = {};

  return rows.map(function(row, i){
    var columns = row.split(',');

    if (columns.length < 3){
      throw "Row " + i + " has " + columns.length + " values, expected 3";
    }

    if (columns.length > 3){
      throw "Row " + i + " has " + columns.length + " values, expected 3";
    }

    var username = columns[0].trim(),
        password = columns[1].trim(),
        name     = columns[2].trim();

    // Ensure the username is unique
    if (users[username]) {
      throw "Duplicate username: " + username;
    }

    // Ensure the password is at least 6 characters
    if (password.length < 6){
      throw "Row " + i + " password too short, must be 6 characters or more";
    }

    // Keep track of this username
    users[username] = true;

    return {
      username: username,
      password: password,
      profile: {
        name: name
      }
    }
  })

}

function getUsersByApi(url){
  var users = [];

  $.ajaxSetup({async:false});
  var response = $.get(url, function (data) {
    return data;
  });

  $.ajaxSetup({async:true});

  if (response.length == 0){
    throw "There's nothing here.";
  }

  $.each(response.responseJSON, function(index, item) {
    // @TODO - implement ROLES
    // @TODO - mark mentors
    // @TODO - remove visitors
    // skip unfinished orders
    // if(item.order_status != 'processing' && item.order_status != 'completed' ) {
    //   return true; // skip
    // }
    //
    // if(item.ticket == 'Visitor Ticket') {
    //     return true;
    // }
    // // skip invalid data
    // if (item.attendee_meta == '') {
    //   return true;
    // }

    var username = item.attendee_meta['e-mail-address'].value.trim(),
        email = item.attendee_meta['e-mail-address'].value.trim(),
        password = item['security_code'].trim(),
        name = item.attendee_meta['first-name'].value.trim() + ' ' + item.attendee_meta['last-name'].value.trim();

    var newUser =  {
      username: username,
      password: password,
      email: email,
      profile: {
        name: name,
        mentor: false,
        email: email
      }
    };

    if(item.ticket == 'Mentor') {
      newUser.profile.mentor = true;
    }

    // add skills
    if(item.attendee_meta['what-programming-languages-tools-are-you-familiar-with']) {
      if(item.attendee_meta['what-programming-languages-tools-are-you-familiar-with'].value) {
        newUser.profile.skills = Object.values(item.attendee_meta['what-programming-languages-tools-are-you-familiar-with'].value);
      }
    }
    //add company & position
    if(item.attendee_meta['job-title'] &&
        item.attendee_meta['company-organization']) {
        newUser.profile.company = item.attendee_meta['company-organization'].value + ' / ' + item.attendee_meta['job-title'].value;
    }

    users.push(newUser);

  });

  return users;

}