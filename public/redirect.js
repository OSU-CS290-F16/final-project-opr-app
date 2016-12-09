window.onload = () => {
	console.log("loaded");

	var submitBtn = document.getElementById("submit-btn");

	submitBtn.addEventListener('click', () => {
		var code = document.getElementById("ec-input").value;
		window.location.href = '/events/' + code;
	})
}