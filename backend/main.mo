import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Principal "mo:core/Principal";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type UserProfile = {
    id : Principal;
    name : Text;
    preferences : Preferences;
  };

  module UserProfile {
    public func compare(profile1 : UserProfile, profile2 : UserProfile) : Order.Order {
      switch (profile1.id.compare(profile2.id)) {
        case (#equal) { Text.compare(profile1.name, profile2.name) };
        case (order) { order };
      };
    };
  };

  type Preferences = {
    voiceEnabled : Bool;
    theme : Text;
    language : Text;
    notifications : Bool;
  };

  type Message = {
    id : Text;
    sender : Text;
    content : Text;
    timestamp : Time.Time;
    messageType : MessageType;
  };

  module Message {
    public func compare(message1 : Message, message2 : Message) : Order.Order {
      switch (Text.compare(message1.id, message2.id)) {
        case (#equal) { Int.compare(message1.timestamp, message2.timestamp) };
        case (order) { order };
      };
    };

    public func compareByTimestamp(message1 : Message, message2 : Message) : Order.Order {
      Int.compare(message1.timestamp, message2.timestamp);
    };
  };

  type MessageType = {
    #text;
    #image;
    #voice;
    #file;
    #systemMessage;
  };

  type Conversation = {
    id : Text;
    user : Principal;
    messages : [Message];
    startTime : Time.Time;
    lastActive : Time.Time;
  };

  module Conversation {
    public func compare(convo1 : Conversation, convo2 : Conversation) : Order.Order {
      Text.compare(convo1.id, convo2.id);
    };
  };

  type UploadedFile = {
    id : Text;
    user : Principal;
    file : Storage.ExternalBlob;
    fileName : Text;
    fileType : FileType;
    uploadTime : Time.Time;
  };

  type FileType = {
    #image;
    #document;
    #audio;
    #video;
  };

  type AssistantState = {
    theme : Text;
    animations : Bool;
    lastUpdate : Time.Time;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let conversations = Map.empty<Text, Conversation>();
  let uploadedFiles = Map.empty<Text, UploadedFile>();

  let activeUsers = Set.empty<Principal>();
  var assistantState : AssistantState = {
    theme = "glassmorphic";
    animations = true;
    lastUpdate = Time.now();
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfile] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all profiles");
    };
    userProfiles.values().toArray().sort();
  };

  public shared ({ caller }) func createConversation(convoId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create conversations");
    };

    let newConversation : Conversation = {
      id = convoId;
      user = caller;
      messages = [];
      startTime = Time.now();
      lastActive = Time.now();
    };

    conversations.add(convoId, newConversation);
  };

  public query ({ caller }) func getConversation(convoId : Text) : async ?Conversation {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view conversations");
    };

    switch (conversations.get(convoId)) {
      case (null) { null };
      case (?convo) {
        if (convo.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own conversations");
        };
        ?convo;
      };
    };
  };

  public query ({ caller }) func getUserConversations(user : Principal) : async [Conversation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view conversations");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own conversations");
    };

    conversations.values().toArray().filter(func(convo) { convo.user == user });
  };

  public shared ({ caller }) func addMessage(convoId : Text, message : Message) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add messages");
    };

    switch (conversations.get(convoId)) {
      case (null) { Runtime.trap("Conversation does not exist") };
      case (?convo) {
        if (convo.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only add messages to your own conversations");
        };

        let updatedMessages = convo.messages.concat([message]);
        let updatedConversation : Conversation = {
          id = convo.id;
          user = convo.user;
          messages = updatedMessages;
          startTime = convo.startTime;
          lastActive = Time.now();
        };
        conversations.add(convoId, updatedConversation);
      };
    };
  };

  public shared ({ caller }) func uploadFile(user : Principal, file : Storage.ExternalBlob, fileName : Text, fileType : FileType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload files");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only upload files for yourself");
    };

    let fileId = user.toText().concat(Time.now().toText());
    let uploadedFile : UploadedFile = {
      id = fileId;
      user;
      file;
      fileName;
      fileType;
      uploadTime = Time.now();
    };

    uploadedFiles.add(fileId, uploadedFile);
  };

  public query ({ caller }) func getUploadedFiles(user : Principal) : async [UploadedFile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view files");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own files");
    };

    uploadedFiles.values().toArray().filter(func(file) { file.user == user });
  };

  public shared ({ caller }) func updateAssistantState(theme : ?Text, animations : ?Bool) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update assistant state");
    };

    let newTheme = switch (theme) {
      case (?t) { t };
      case (null) { assistantState.theme };
    };

    let newAnimations = switch (animations) {
      case (?a) { a };
      case (null) { assistantState.animations };
    };

    assistantState := {
      theme = newTheme;
      animations = newAnimations;
      lastUpdate = Time.now();
    };
  };

  public query ({ caller }) func getAssistantState() : async AssistantState {
    assistantState;
  };
};
