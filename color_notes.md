Okay, let's take a minute to describe the desired behavior for this feature.

1. The preference pane will need to display the current user color behavior.
	* One button for the current behavior. Clicking it toggles the current setting.
2. Clicking the current user behavior will enable or disable the feature:
	* Enable
		* Go through each line in the chat log and **ADD** usernames coors.
		* Enable the persistance user color flag. Every message after this will check the value of this flag and colorize as appropriate.
	* Disable: The extension must remove color from every line in the chat log.
		* Go through each line in the chat log and **REMOVE** username colors.
		* Enable the persistance user color flag. Every message after this will check the value of this flag and colorize as appropriate.
3. When recieving chat messages, the extension must color usernames as appropriate
	* Every time a message event is fired, check to see if the flag is enabled.
	* If enabled, a message will be sent 


REQUIREMENTS:
* Functions
	* Strip colors from all existing messges
	* Add colors to all existing messages
	* Add color to a new message.
* Pref setting
	* Persistant storage for the current pref setting


Okay, with that in mind, what do we have right now?
* A function to change the color of a single message. (`colorUsername`)
* A funciton to add/remove colors from existing messages. (`toggleUsernameColor`)